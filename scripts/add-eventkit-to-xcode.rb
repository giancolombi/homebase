#!/usr/bin/env ruby
# Adds the EventKit plugin Swift + Obj-C source files to the App Xcode
# target. Run after `cap add ios` regenerates the project, or after a fresh
# clone before opening Xcode.
#
# Idempotent: re-running is a no-op once the files are already members of
# the Sources build phase.
#
# We invoke this with cocoapods' bundled xcodeproj gem to avoid a separate
# Ruby gem install step on developer machines that already have CocoaPods.

require "xcodeproj"
require "pathname"

ROOT = Pathname.new(File.expand_path("..", __dir__))
PROJ = ROOT.join("ios", "App", "App.xcodeproj")
PLUGINS_DIR = ROOT.join("ios", "App", "App", "Plugins")
APP_TARGET_NAME = "App"

unless PROJ.exist?
  warn "Xcode project not found at #{PROJ}. Run `pnpm cap:add:ios` first."
  exit 1
end

unless PLUGINS_DIR.exist?
  warn "Plugins directory missing at #{PLUGINS_DIR}. Run `node scripts/install-eventkit-plugin.mjs`."
  exit 1
end

project = Xcodeproj::Project.open(PROJ.to_s)
target = project.targets.find { |t| t.name == APP_TARGET_NAME }
unless target
  warn "Target '#{APP_TARGET_NAME}' not found in #{PROJ}."
  exit 1
end

app_group = project.main_group["App"]
unless app_group
  warn "Group 'App' not found in main group."
  exit 1
end

plugins_group = app_group["Plugins"] || app_group.new_group("Plugins", "Plugins")

# Clean out any prior, mis-pathed entries from previous failed runs of this
# script. The group itself has path "Plugins" so file refs should be
# JUST filenames — anything with "Plugins/" prefix would resolve to
# Plugins/Plugins/foo.swift and break the build.
plugins_group.files.dup.each do |existing|
  if existing.path && existing.path.include?("/")
    target.source_build_phase.remove_file_reference(existing) if existing.path.match?(/\.(swift|m|mm)$/)
    existing.remove_from_project
  end
end

added = []
PLUGINS_DIR.children.each do |path|
  next unless path.file?
  filename = path.basename.to_s

  existing = plugins_group.files.find { |f| f.path == filename }
  file_ref = existing || plugins_group.new_reference(filename)

  case path.extname
  when ".swift", ".m", ".mm"
    unless target.source_build_phase.files_references.include?(file_ref)
      target.source_build_phase.add_file_reference(file_ref)
      added << filename
    end
  end
end

project.save

if added.empty?
  puts "EventKit plugin already wired into the App target."
else
  puts "Added to App target: #{added.join(", ")}"
end
