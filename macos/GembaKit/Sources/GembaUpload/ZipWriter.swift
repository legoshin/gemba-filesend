import Foundation
import zlib

/// Writes a folder to a standard .zip, streaming, with nothing but the system's
/// zlib.
///
/// Why not `NSFileCoordinator`'s `.forUploading` (Finder's Compress)? Inside the
/// App Sandbox — which is where the Share Extension runs — it fails on symbolic
/// links with "couldn't be opened because there is no such file", even on
/// perfectly valid relative links like `node_modules/.bin/jsesc`. Outside the
/// sandbox it handles them, which is why tests never caught it. Developer
/// folders are full of such links, so a zipper that trips on them is not usable.
///
/// This writer:
///   - stores symlinks *as links* (Unix mode 0120xxx, target path as content),
///     exactly as Finder and `ditto` do — never followed, so it never reads
///     anything outside the folder that was shared, and never loops;
///   - keeps empty directories and Unix permissions (the executable bit on
///     `node_modules/.bin` scripts survives the round trip);
///   - writes names as UTF-8 (flag bit 11), normalised to NFC so Windows and
///     Linux see the same characters macOS shows;
///   - streams each file through raw DEFLATE in 1 MiB chunks, so memory stays
///     flat however large the folder;
///   - switches to ZIP64 per entry and for the directory when any size, offset
///     or the entry count outgrows the classic format.
/// The folder itself is the top level of the archive, like Finder's Compress.
public enum ZipWriter {
    public enum ZipError: Error, LocalizedError {
        case cannotCreate(String)
        case unreadable(String, String)
        case deflateFailed(String, Int32)

        public var errorDescription: String? {
            switch self {
            case .cannotCreate(let path): return "Couldn't create the archive at \(path)."
            case .unreadable(let path, let why): return "Couldn't read \(path): \(why)"
            case .deflateFailed(let path, let code): return "Compressing \(path) failed (zlib \(code))."
            }
        }
    }

    /// Size thresholds for switching to ZIP64. Tests lower them to exercise the
    /// ZIP64 paths without writing 4 GB.
    struct Limits {
        var maxClassic32: UInt64 = 0xFFFF_FFFF
        var maxClassicEntries: Int = 0xFFFF
        /// Deflate can grow incompressible data slightly; anything this close
        /// to the 4 GB line is written as ZIP64 from the start.
        var zip64Margin: UInt64 = 0x10_0000
    }

    public static func archive(
        folder: URL,
        to destination: URL,
        progress: ((Double) -> Void)? = nil
    ) throws {
        try archive(folder: folder, to: destination, limits: Limits(), progress: progress)
    }

    static func archive(
        folder: URL,
        to destination: URL,
        limits: Limits,
        progress: ((Double) -> Void)?
    ) throws {
        FileManager.default.createFile(atPath: destination.path, contents: nil)
        guard let handle = FileHandle(forWritingAtPath: destination.path) else {
            throw ZipError.cannotCreate(destination.path)
        }
        defer { try? handle.close() }
        let writer = Writer(handle: handle, limits: limits)

        let root = folder.standardizedFileURL
        let rootName = nfc(root.lastPathComponent)
        let items = try inventory(of: root)
        let totalBytes = max(1, items.reduce(UInt64(0)) { $0 + $1.size })
        var doneBytes: UInt64 = 0

        try writer.addDirectory(name: rootName + "/", mode: posixMode(root) ?? 0o755, modified: modified(root))
        for item in items {
            let name = rootName + "/" + item.relativePath
            switch item.kind {
            case .directory:
                try writer.addDirectory(name: name + "/", mode: item.mode, modified: item.modified)
            case .symlink(let target):
                try writer.addSymlink(name: name, target: target, mode: item.mode, modified: item.modified)
            case .file:
                try writer.addFile(name: name, source: item.url, size: item.size, mode: item.mode,
                                   modified: item.modified) { chunk in
                    doneBytes += chunk
                    progress?(min(1, Double(doneBytes) / Double(totalBytes)))
                }
            }
        }
        try writer.finish()
        progress?(1)
    }

    // MARK: - Inventory

    struct Item {
        enum Kind { case file, directory, symlink(String) }
        let url: URL
        let relativePath: String
        let kind: Kind
        let size: UInt64
        let mode: UInt16
        let modified: Date
    }

    /// Walks the tree without following links. Sockets, FIFOs and device files
    /// are skipped — they have no meaning inside an archive. Anything else that
    /// can't be placed is an error, never a silent omission: leaving a file out
    /// of a share without saying so is worse than refusing.
    ///
    /// Two traps this avoids, both hit in development:
    ///   - `skipDescendants()` is for directories. Called after a symlink entry it
    ///     can skip the *rest of the current folder*. It isn't needed anyway —
    ///     the enumerator never descends through links.
    ///   - The enumerator hands back resolved paths (`/private/tmp/…` for a root
    ///     given as `/tmp/…`), so relative paths are taken against the resolved
    ///     root, and each entry's *parent* is resolved — never the entry itself,
    ///     which may be a link that must stay a link.
    static func inventory(of root: URL) throws -> [Item] {
        let fm = FileManager.default
        let resolvedRoot = root.resolvingSymlinksInPath().standardizedFileURL.path
        let rootPrefix = resolvedRoot.hasSuffix("/") ? resolvedRoot : resolvedRoot + "/"

        guard let enumerator = fm.enumerator(
            at: root, includingPropertiesForKeys: [.isSymbolicLinkKey], options: [],
            errorHandler: { _, _ in true }
        ) else { throw ZipError.unreadable(root.path, "the folder can't be listed") }

        var items: [Item] = []
        for case let url as URL in enumerator {
            let parent = url.deletingLastPathComponent().resolvingSymlinksInPath().standardizedFileURL.path
            let path = (parent.hasSuffix("/") ? parent : parent + "/") + url.lastPathComponent
            guard path.hasPrefix(rootPrefix) else {
                throw ZipError.unreadable(url.path, "it is outside the folder being compressed")
            }
            let relative = nfc(String(path.dropFirst(rootPrefix.count)))

            // lstat semantics: describes the entry itself, links included, and
            // works for a link whose target doesn't exist.
            let attributes: [FileAttributeKey: Any]
            do { attributes = try fm.attributesOfItem(atPath: url.path) } catch {
                throw ZipError.unreadable(url.path, error.localizedDescription)
            }
            let type = attributes[.type] as? FileAttributeType
            let mode = (attributes[.posixPermissions] as? NSNumber).map { UInt16(truncating: $0) & 0o7777 }
            let modified = attributes[.modificationDate] as? Date ?? Date()

            switch type {
            case .typeSymbolicLink?:
                let target: String
                do { target = try fm.destinationOfSymbolicLink(atPath: url.path) } catch {
                    throw ZipError.unreadable(url.path, error.localizedDescription)
                }
                items.append(Item(url: url, relativePath: relative, kind: .symlink(target),
                                  size: 0, mode: mode ?? 0o755, modified: modified))
            case .typeDirectory?:
                items.append(Item(url: url, relativePath: relative, kind: .directory,
                                  size: 0, mode: mode ?? 0o755, modified: modified))
            case .typeRegular?:
                let size = (attributes[.size] as? NSNumber)?.uint64Value ?? 0
                items.append(Item(url: url, relativePath: relative, kind: .file,
                                  size: size, mode: mode ?? 0o644, modified: modified))
            default:
                continue   // socket, FIFO, device: not archivable, not content
            }
        }
        return items
    }

    static func posixMode(_ url: URL) -> UInt16? {
        // lstat semantics: attributesOfItem does not follow a final symlink.
        (try? FileManager.default.attributesOfItem(atPath: url.path)[.posixPermissions] as? NSNumber)
            .map { UInt16(truncating: $0) & 0o7777 }
    }

    static func modified(_ url: URL) -> Date {
        (try? url.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? Date()
    }

    /// macOS hands out names in whatever normalisation they were created with;
    /// Windows and Linux expect composed characters. Store NFC.
    static func nfc(_ s: String) -> String { s.precomposedStringWithCanonicalMapping }

    // MARK: - Writer

    struct CentralRecord {
        let name: [UInt8]
        let method: UInt16
        let flags: UInt16
        let dosTime: UInt16
        let dosDate: UInt16
        let crc: UInt32
        let compressed: UInt64
        let uncompressed: UInt64
        let offset: UInt64
        let externalAttributes: UInt32
        let neededVersion: UInt16
    }

    /// Performance matters here: a developer folder can hold tens of thousands
    /// of small files, and per-file setup — not DEFLATE — was what made the
    /// first version slow (a fresh 1 MiB buffer and zlib stream per file). So:
    /// one zlib stream, reset between files; one output buffer; writes batched
    /// in memory; and a small file's header patched in the batch instead of by
    /// seeking back through the file.
    final class Writer {
        let handle: FileHandle
        let limits: Limits
        /// Bytes of the archive written so far, flushed or pending.
        private(set) var offset: UInt64 = 0
        var records: [CentralRecord] = []

        private var pending: [UInt8] = []
        private var flushedOffset: UInt64 = 0
        private let flushThreshold = 4 << 20

        // Heap-allocated: zlib keeps a back-pointer to its z_stream and refuses
        // one that has moved, which a Swift stored struct may do.
        private let stream: UnsafeMutablePointer<z_stream>
        private var streamReady = false
        private let outCapacity = 1 << 18
        private let outBuffer: UnsafeMutablePointer<UInt8>

        static let unixMadeBy: UInt16 = (3 << 8) | 63      // Unix, spec 6.3
        static let utf8Flag: UInt16 = 1 << 11

        init(handle: FileHandle, limits: Limits) {
            self.handle = handle
            self.limits = limits
            self.stream = .allocate(capacity: 1)
            self.stream.initialize(to: z_stream())
            self.outBuffer = .allocate(capacity: 1 << 18)
            pending.reserveCapacity(flushThreshold + (1 << 18))
        }

        deinit {
            if streamReady { deflateEnd(stream) }
            stream.deinitialize(count: 1)
            stream.deallocate()
            outBuffer.deallocate()
        }

        func write(_ bytes: [UInt8]) throws {
            pending += bytes
            offset += UInt64(bytes.count)
            if pending.count >= flushThreshold { try flush() }
        }

        func write(_ bytes: UnsafeRawBufferPointer) throws {
            pending.append(contentsOf: bytes.bindMemory(to: UInt8.self))
            offset += UInt64(bytes.count)
            if pending.count >= flushThreshold { try flush() }
        }

        func flush() throws {
            guard !pending.isEmpty else { return }
            try handle.write(contentsOf: pending)
            flushedOffset += UInt64(pending.count)
            pending.removeAll(keepingCapacity: true)
        }

        /// Overwrites already-written bytes: in the batch if they are still in
        /// it (the common case for small files), otherwise on disk.
        func patch(at position: UInt64, with bytes: [UInt8]) throws {
            if position >= flushedOffset {
                let start = Int(position - flushedOffset)
                pending.replaceSubrange(start..<(start + bytes.count), with: bytes)
            } else {
                try flush()
                try handle.seek(toOffset: position)
                try handle.write(contentsOf: bytes)
                try handle.seek(toOffset: flushedOffset)
            }
        }

        func resetDeflate(for path: String) throws {
            let status: Int32
            if streamReady {
                status = deflateReset(stream)
            } else {
                status = deflateInit2_(stream, Z_BEST_SPEED, Z_DEFLATED, -MAX_WBITS, 8, Z_DEFAULT_STRATEGY,
                                       ZLIB_VERSION, Int32(MemoryLayout<z_stream>.size))
                streamReady = status == Z_OK
            }
            guard status == Z_OK else { throw ZipError.deflateFailed(path, status) }
        }

        func addDirectory(name: String, mode: UInt16, modified: Date) throws {
            // Directory mode in the Unix half, MS-DOS directory bit in the low byte.
            let attrs = (UInt32(0o040000 | UInt32(mode)) << 16) | 0x10
            try addStored(name: name, content: [], attributes: attrs, modified: modified)
        }

        func addSymlink(name: String, target: String, mode: UInt16, modified: Date) throws {
            let attrs = UInt32(0o120000 | UInt32(mode == 0 ? 0o755 : mode)) << 16
            try addStored(name: name, content: Array(target.utf8), attributes: attrs, modified: modified)
        }

        private func addStored(name: String, content: [UInt8], attributes: UInt32, modified: Date) throws {
            let nameBytes = Array(name.utf8)
            let crc = content.withUnsafeBufferPointer { crc32(0, $0.baseAddress, uInt($0.count)) }
            let (time, date) = dosDateTime(modified)
            let localOffset = offset
            var header = ByteWriter()
            header.u32(0x0403_4b50)
            header.u16(20); header.u16(Self.utf8Flag); header.u16(0)
            header.u16(time); header.u16(date)
            header.u32(UInt32(crc)); header.u32(UInt32(content.count)); header.u32(UInt32(content.count))
            header.u16(UInt16(nameBytes.count)); header.u16(0)
            header.bytes(nameBytes)
            try write(header.buffer)
            if !content.isEmpty { try write(content) }
            records.append(CentralRecord(name: nameBytes, method: 0, flags: Self.utf8Flag, dosTime: time, dosDate: date,
                                         crc: UInt32(crc), compressed: UInt64(content.count),
                                         uncompressed: UInt64(content.count), offset: localOffset,
                                         externalAttributes: attributes, neededVersion: 20))
        }

        func addFile(name: String, source: URL, size: UInt64, mode: UInt16, modified: Date,
                              onChunk: (UInt64) -> Void) throws {
            guard let input = FileHandle(forReadingAtPath: source.path) else {
                throw ZipError.unreadable(source.path, "permission denied or the file vanished")
            }
            defer { try? input.close() }

            let nameBytes = Array(name.utf8)
            let (time, date) = dosDateTime(modified)
            let localOffset = offset
            let zip64 = size + limits.zip64Margin >= limits.maxClassic32
            // Already-compressed formats gain nothing from DEFLATE but cost CPU;
            // store them. Empty files have nothing to compress either.
            let method: UInt16 = (size == 0 || ZipWriter.isAlreadyCompressed(source)) ? 0 : 8

            // Local header with placeholders; sizes and CRC are patched once known.
            var header = ByteWriter()
            header.u32(0x0403_4b50)
            header.u16(zip64 ? 45 : 20); header.u16(Self.utf8Flag); header.u16(method)
            header.u16(time); header.u16(date)
            header.u32(0)                                            // crc, patched
            header.u32(zip64 ? 0xFFFF_FFFF : 0)                      // compressed, patched
            header.u32(zip64 ? 0xFFFF_FFFF : 0)                      // uncompressed, patched
            header.u16(UInt16(nameBytes.count)); header.u16(zip64 ? 20 : 0)
            header.bytes(nameBytes)
            if zip64 { header.u16(0x0001); header.u16(16); header.u64(0); header.u64(0) }
            try write(header.buffer)
            let dataStart = offset

            var crc: uLong = crc32(0, nil, 0)
            var uncompressed: UInt64 = 0
            let readChunk = 1 << 20

            if method == 0 {
                // Stored: copy through in chunks, CRC as we go.
                while true {
                    let data: Data
                    do { data = try input.read(upToCount: readChunk) ?? Data() } catch {
                        throw ZipError.unreadable(source.path, error.localizedDescription)
                    }
                    if data.isEmpty { break }
                    try data.withUnsafeBytes { raw in
                        crc = crc32(crc, raw.bindMemory(to: Bytef.self).baseAddress, uInt(raw.count))
                        try write(raw)
                    }
                    uncompressed += UInt64(data.count)
                    onChunk(UInt64(data.count))
                }
            } else {
                try resetDeflate(for: source.path)
                var finished = false
                while !finished {
                    let data: Data
                    do { data = try input.read(upToCount: readChunk) ?? Data() } catch {
                        throw ZipError.unreadable(source.path, error.localizedDescription)
                    }
                    let flush = data.isEmpty ? Z_FINISH : Z_NO_FLUSH
                    try data.withUnsafeBytes { raw in
                        let base = raw.bindMemory(to: Bytef.self).baseAddress
                        if !data.isEmpty { crc = crc32(crc, base, uInt(raw.count)) }
                        stream.pointee.next_in = UnsafeMutablePointer(mutating: base)
                        stream.pointee.avail_in = uInt(raw.count)
                        var status: Int32 = Z_OK
                        repeat {
                            stream.pointee.next_out = outBuffer
                            stream.pointee.avail_out = uInt(outCapacity)
                            status = deflate(stream, flush)
                            guard status != Z_STREAM_ERROR else { throw ZipError.deflateFailed(source.path, status) }
                            let produced = outCapacity - Int(stream.pointee.avail_out)
                            if produced > 0 { try write(UnsafeRawBufferPointer(start: outBuffer, count: produced)) }
                        } while stream.pointee.avail_out == 0 || (flush == Z_FINISH && status != Z_STREAM_END)
                    }
                    uncompressed += UInt64(data.count)
                    if !data.isEmpty { onChunk(UInt64(data.count)) }
                    if flush == Z_FINISH { finished = true }
                }
            }

            let compressed = offset - dataStart
            // The file may have changed size since the inventory; trust what was read.
            if !zip64 && (compressed >= limits.maxClassic32 || uncompressed >= limits.maxClassic32) {
                throw ZipError.unreadable(source.path, "grew past 4 GB while being compressed")
            }

            // Patch CRC and sizes into the local header.
            var fields = ByteWriter()
            fields.u32(UInt32(crc))
            if zip64 {
                fields.u32(0xFFFF_FFFF); fields.u32(0xFFFF_FFFF)
            } else {
                fields.u32(UInt32(compressed)); fields.u32(UInt32(uncompressed))
            }
            try patch(at: localOffset + 14, with: fields.buffer)
            if zip64 {
                var sizes = ByteWriter(); sizes.u64(uncompressed); sizes.u64(compressed)
                try patch(at: localOffset + 30 + UInt64(nameBytes.count) + 4, with: sizes.buffer)
            }

            let attrs = UInt32(0o100000 | UInt32(mode)) << 16
            records.append(CentralRecord(name: nameBytes, method: method, flags: Self.utf8Flag,
                                         dosTime: time, dosDate: date, crc: UInt32(crc),
                                         compressed: compressed, uncompressed: uncompressed, offset: localOffset,
                                         externalAttributes: attrs, neededVersion: zip64 ? 45 : 20))
        }

        func finish() throws {
            let directoryStart = offset
            let max32 = limits.maxClassic32
            var anyZip64 = false

            for r in records {
                let bigUncompressed = r.uncompressed >= max32
                let bigCompressed = r.compressed >= max32
                let bigOffset = r.offset >= max32
                var extra = ByteWriter()
                if bigUncompressed || bigCompressed || bigOffset {
                    var fields = ByteWriter()
                    if bigUncompressed { fields.u64(r.uncompressed) }
                    if bigCompressed { fields.u64(r.compressed) }
                    if bigOffset { fields.u64(r.offset) }
                    extra.u16(0x0001); extra.u16(UInt16(fields.buffer.count)); extra.bytes(fields.buffer)
                    anyZip64 = true
                }
                var h = ByteWriter()
                h.u32(0x0201_4b50)
                h.u16(Self.unixMadeBy)
                h.u16(extra.buffer.isEmpty ? r.neededVersion : 45)
                h.u16(r.flags); h.u16(r.method); h.u16(r.dosTime); h.u16(r.dosDate)
                h.u32(r.crc)
                h.u32(bigCompressed ? 0xFFFF_FFFF : UInt32(r.compressed))
                h.u32(bigUncompressed ? 0xFFFF_FFFF : UInt32(r.uncompressed))
                h.u16(UInt16(r.name.count)); h.u16(UInt16(extra.buffer.count)); h.u16(0)
                h.u16(0); h.u16(0)
                h.u32(r.externalAttributes)
                h.u32(bigOffset ? 0xFFFF_FFFF : UInt32(r.offset))
                h.bytes(r.name)
                h.bytes(extra.buffer)
                try write(h.buffer)
            }

            let directorySize = offset - directoryStart
            let count = records.count
            let needZip64 = anyZip64 || count >= limits.maxClassicEntries
                || directoryStart >= max32 || directorySize >= max32

            if needZip64 {
                let zip64EndOffset = offset
                var z = ByteWriter()
                z.u32(0x0606_4b50); z.u64(44)
                z.u16(Self.unixMadeBy); z.u16(45)
                z.u32(0); z.u32(0)
                z.u64(UInt64(count)); z.u64(UInt64(count))
                z.u64(directorySize); z.u64(directoryStart)
                z.u32(0x0706_4b50); z.u32(0); z.u64(zip64EndOffset); z.u32(1)
                try write(z.buffer)
            }

            var end = ByteWriter()
            end.u32(0x0605_4b50)
            end.u16(0); end.u16(0)
            let clampedCount = UInt16(min(count, 0xFFFF))
            end.u16(needZip64 ? 0xFFFF : clampedCount); end.u16(needZip64 ? 0xFFFF : clampedCount)
            end.u32(needZip64 ? 0xFFFF_FFFF : UInt32(directorySize))
            end.u32(needZip64 ? 0xFFFF_FFFF : UInt32(directoryStart))
            end.u16(0)
            try write(end.buffer)
            try flush()
        }
    }

    /// Formats whose content is already compressed. Deflating them again costs
    /// time and usually makes them slightly larger.
    static let compressedExtensions: Set<String> = [
        "jpg", "jpeg", "png", "gif", "heic", "heif", "webp", "avif",
        "mp4", "mov", "m4v", "mkv", "webm", "avi", "mp3", "m4a", "aac", "flac", "ogg", "opus",
        "zip", "gz", "tgz", "bz2", "xz", "zst", "7z", "rar", "dmg", "jar", "apk", "ipa", "whl",
        "docx", "xlsx", "pptx", "pages", "numbers", "key", "woff", "woff2",
    ]

    static func isAlreadyCompressed(_ url: URL) -> Bool {
        compressedExtensions.contains(url.pathExtension.lowercased())
    }

    /// MS-DOS date/time, local time, 2-second resolution, floor 1980.
    static func dosDateTime(_ date: Date) -> (UInt16, UInt16) {
        let c = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date)
        let year = max(1980, min(2107, c.year ?? 1980))
        let time = UInt16((c.hour ?? 0) << 11 | (c.minute ?? 0) << 5 | (c.second ?? 0) / 2)
        let day = UInt16((year - 1980) << 9 | (c.month ?? 1) << 5 | (c.day ?? 1))
        return (time, day)
    }
}

/// Little-endian byte assembly for zip structures.
struct ByteWriter {
    var buffer: [UInt8] = []
    mutating func u16(_ v: UInt16) { buffer += [UInt8(v & 0xFF), UInt8(v >> 8)] }
    mutating func u32(_ v: UInt32) { for i in 0..<4 { buffer.append(UInt8((v >> (8 * UInt32(i))) & 0xFF)) } }
    mutating func u64(_ v: UInt64) { for i in 0..<8 { buffer.append(UInt8((v >> (8 * UInt64(i))) & 0xFF)) } }
    mutating func bytes(_ b: [UInt8]) { buffer += b }
}
