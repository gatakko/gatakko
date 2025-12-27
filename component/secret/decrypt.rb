#!/usr/bin/env ruby
require 'yaml'

input = YAML.load($<.read)
ident = input['functionConfig']['privateKeyFile'] || ''
dirs = input['functionConfig']['directories'] || []

output = {}
output['apiVersion'] = 'config.kubernetes.io/v1'
output['kind'] = 'ResourceList'
output['items'] = []

dirs.each do |dir|
  Dir.glob(['**/*.yaml.age', '**/*.yaml'], base: dir) do |filename|
    filename = File.join(dir, filename)
    if filename.end_with?('.age') then
      content = IO.popen(['age', '-d', '-i', ident, filename]) { |io| io.read }
      raise "age failed" unless $?.success?
    else
      content = File.read(filename)
    end
    output['items'].push(YAML.load(content))
  end
end

print(YAML.dump(output))
