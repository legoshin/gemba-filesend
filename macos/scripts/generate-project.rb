#!/usr/bin/env ruby
# Generates macos/GembaFilesend.xcodeproj from the sources in this folder.
#
# The project file is generated rather than hand-maintained so that the build
# configuration is reviewable as code and a stale pbxproj can never drift from
# the sources. Run after adding or removing a file:
#
#   cd macos && ruby scripts/generate-project.rb
#
require "xcodeproj"

ROOT = File.expand_path("..", __dir__)
PROJECT_PATH = File.join(ROOT, "GembaFilesend.xcodeproj")
APP_BUNDLE_ID = "uk.gemba.filesend.mac"
DEPLOYMENT_TARGET = "14.0"
SWIFT_VERSION = "6.0"

FileUtils = Object.const_get(:FileUtils) if false
require "fileutils"
FileUtils.rm_rf(PROJECT_PATH)

project = Xcodeproj::Project.new(PROJECT_PATH)

# Signing lives in one xcconfig so a machine without a certificate still builds
# and the distribution path is a script concern, not a project edit.
configs_group = project.new_group("Configs", "Configs")
signing_xcconfig = configs_group.new_reference("Signing.xcconfig")

# Shared settings for every target and configuration.
BASE_SETTINGS = {
  "MACOSX_DEPLOYMENT_TARGET" => DEPLOYMENT_TARGET,
  "SWIFT_VERSION" => SWIFT_VERSION,
  "SDKROOT" => "macosx",
  "ALWAYS_SEARCH_USER_PATHS" => "NO",
  "CLANG_ENABLE_OBJC_ARC" => "YES",
  "GENERATE_INFOPLIST_FILE" => "NO",
  "SWIFT_EMIT_LOC_STRINGS" => "YES",
  # Signing (identity, team, hardened runtime) comes from Configs/Signing.xcconfig
  # so that one file is the only thing to change, and scripts/package-dmg.sh can
  # override it on the command line for a Developer ID build.
  "CODE_SIGNING_REQUIRED" => "YES",
  "CODE_SIGNING_ALLOWED" => "YES",
  "PROVISIONING_PROFILE_SPECIFIER" => "",
}.freeze

project.build_configurations.each do |config|
  config.base_configuration_reference = signing_xcconfig
  config.build_settings.merge!(BASE_SETTINGS)
  config.build_settings["ONLY_ACTIVE_ARCH"] = config.name == "Debug" ? "YES" : "NO"
  config.build_settings["SWIFT_OPTIMIZATION_LEVEL"] = config.name == "Debug" ? "-Onone" : "-O"
  config.build_settings["SWIFT_ACTIVE_COMPILATION_CONDITIONS"] = "DEBUG" if config.name == "Debug"
  # Xcode injects com.apple.security.get-task-allow (the "a debugger may attach"
  # entitlement) into signed builds by default. Notarization rejects it, so
  # Release must not carry it; Debug keeps it or the debugger cannot attach.
  config.build_settings["CODE_SIGN_INJECT_BASE_ENTITLEMENTS"] = config.name == "Debug" ? "YES" : "NO"
end

# The local package holding the crypto + upload core, shared by both targets so
# there is exactly one implementation of the wire format.
package_ref = project.new(Xcodeproj::Project::Object::XCLocalSwiftPackageReference)
package_ref.relative_path = "GembaKit"
project.root_object.package_references << package_ref

def package_product(project, package_ref, name)
  dependency = project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
  dependency.product_name = name
  dependency.package = package_ref
  dependency
end

# ---------------------------------------------------------------- app target
app = project.new_target(:application, "GembaFilesend", :osx, DEPLOYMENT_TARGET)
app.build_configurations.each do |config|
  config.build_settings.merge!(BASE_SETTINGS)
  config.build_settings["CODE_SIGN_INJECT_BASE_ENTITLEMENTS"] = config.name == "Debug" ? "YES" : "NO"
  config.build_settings.merge!(
    "PRODUCT_NAME" => "Gemba Filesend",
    "PRODUCT_BUNDLE_IDENTIFIER" => APP_BUNDLE_ID,
    "INFOPLIST_FILE" => "GembaFilesend/Info.plist",
    "CODE_SIGN_ENTITLEMENTS" => "GembaFilesend/GembaFilesend.entitlements",
    "LD_RUNPATH_SEARCH_PATHS" => ["$(inherited)", "@executable_path/../Frameworks"],
    "COMBINE_HIDPI_IMAGES" => "YES",
    "ENABLE_PREVIEWS" => "YES",
    "ASSETCATALOG_COMPILER_APPICON_NAME" => "",
    "INFOPLIST_KEY_CFBundleIconFile" => "AppIcon",
  )
end

# ---------------------------------------------------------- extension target
extension = project.new_target(:app_extension, "ShareExtension", :osx, DEPLOYMENT_TARGET)
extension.build_configurations.each do |config|
  config.build_settings.merge!(BASE_SETTINGS)
  config.build_settings["CODE_SIGN_INJECT_BASE_ENTITLEMENTS"] = config.name == "Debug" ? "YES" : "NO"
  config.build_settings.merge!(
    "PRODUCT_NAME" => "ShareExtension",
    "PRODUCT_BUNDLE_IDENTIFIER" => "#{APP_BUNDLE_ID}.ShareExtension",
    "INFOPLIST_FILE" => "ShareExtension/Info.plist",
    "CODE_SIGN_ENTITLEMENTS" => "ShareExtension/ShareExtension.entitlements",
    "LD_RUNPATH_SEARCH_PATHS" => ["$(inherited)", "@executable_path/../Frameworks", "@executable_path/../../../../Frameworks"],
    "SKIP_INSTALL" => "YES",
  )
end

# ------------------------------------------------------------------- sources
app_group = project.new_group("GembaFilesend", "GembaFilesend")
extension_group = project.new_group("ShareExtension", "ShareExtension")

APP_SOURCES = ["GembaFilesendApp.swift", "ContentView.swift", "UploadModel.swift", "GembaTheme.swift"].freeze
# The theme is compiled into both targets: the extension draws the same
# components, and a package target for four colours would be ceremony.
EXTENSION_SOURCES = ["ShareViewController.swift"].freeze

APP_SOURCES.each { |name| app.add_file_references([app_group.new_reference(name)]) }
EXTENSION_SOURCES.each { |name| extension.add_file_references([extension_group.new_reference(name)]) }
theme_ref = app_group.files.find { |f| f.path == "GembaTheme.swift" }
extension.add_file_references([theme_ref])

icon_path = File.join(ROOT, "GembaFilesend", "AppIcon.icns")
if File.exist?(icon_path)
  icon_ref = app_group.new_reference("AppIcon.icns")
  app.add_resources([icon_ref])
else
  warn "AppIcon.icns missing — run scripts/make-icon.sh (building without an icon)"
end

[["Info.plist", app_group], ["GembaFilesend.entitlements", app_group]].each do |name, group|
  group.new_reference(name) unless group.files.any? { |f| f.path == name }
end
[["Info.plist", extension_group], ["ShareExtension.entitlements", extension_group]].each do |name, group|
  group.new_reference(name) unless group.files.any? { |f| f.path == name }
end

# --------------------------------------------------------------- package deps
%w[GembaCrypto GembaUpload].each do |product|
  [app, extension].each do |target|
    dependency = package_product(project, package_ref, product)
    target.package_product_dependencies << dependency
    target.frameworks_build_phase.add_file_reference(
      project.new(Xcodeproj::Project::Object::PBXBuildFile).tap { |bf| bf.product_ref = dependency }
    ) rescue nil
  end
end

# Link the package products properly: xcodeproj needs the build file to carry
# the product ref, which `add_file_reference` above cannot do on its own.
[app, extension].each do |target|
  phase = target.frameworks_build_phase
  phase.files.each { |f| phase.remove_build_file(f) if f.file_ref.nil? && f.product_ref.nil? }
  target.package_product_dependencies.each do |dependency|
    next if phase.files.any? { |f| f.product_ref == dependency }
    build_file = project.new(Xcodeproj::Project::Object::PBXBuildFile)
    build_file.product_ref = dependency
    phase.files << build_file
  end
end

# ------------------------------------------- embed the extension into the app
embed_phase = app.new_copy_files_build_phase("Embed Foundation Extensions")
embed_phase.symbol_dst_subfolder_spec = :plug_ins
embed_phase.dst_path = ""
embed_build_file = embed_phase.add_file_reference(extension.product_reference)
embed_build_file.settings = { "ATTRIBUTES" => ["RemoveHeadersOnCopy"] }
app.add_dependency(extension)

project.save
puts "wrote #{PROJECT_PATH}"
