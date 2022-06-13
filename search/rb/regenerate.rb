#!/usr/bin/ruby
require "dropbox_api"
load "perDevParams.rb" # AccessToken & MasCloudAddress

client = DropboxApi::Client.new(AccessToken)

out = ""
outDir = Dir.pwd + "/js"
# MasCloudAddress = "/cloud-backup/archives/upto5apr2022/mas"
# en donde en tu Dropbox tienes la carpeta de MAS?

sampleCount = 0
sampleMax = 10
# maximo de archivos/carpetas por indizar, en 2021 ya eran casi 50,000 archivos

def toJSON( entry ) dirOrFile = entry.respond_to?(:size) ? :file : :dir;
	'{"type":"'+dirOrFile.to_s+'", '+
		'"name":"'+"#{entry.name}"+'",'+
		'"path":"'+"#{entry.path_display}"+'"'+
		(dirOrFile == :file ? (', "time":"'+entry.server_modified.to_s+'"') : '')+
		(dirOrFile == :file ? (', "size":'+entry.size.to_s+'') : '')+
		"},\r\n"
end

roots = client.list_folder(MasCloudAddress).entries
[roots.first].each do |root|
	list_folder = client.list_folder( root.path_display, recursive:true)
	i = list_folder
	cursor = i.cursor
	loop do 
		i.entries.each do |entry|
			entryOut = toJSON(entry)
			sampleCount += 1
			puts ("%06d" % sampleCount) + " - "+ entryOut
			out += entryOut
			if sampleCount > sampleMax
				abort "sampleMax reached!"
			end
		end
		if not i.has_more?
			break
		else
			i = client.list_folder_continue( cursor )
			cursor = i.cursor
		end
	end
end
# falta quitarle el /MAS/ de raiz a los paths

File.open(outDir+"MAS-paths.js", "w+") do |f|
	f.puts "const list= [\r\n"+out+"]"
end

#{
	#"type" #-> "dir" if no size, else "file"
	#"path": #->@path_display
	#"name" #-> @name
	#"time" #-> use @server_modified
	#"size" #-> @size, only available if not a file
#},


#<DropboxApi::Metadata::Folder:0x007fdb80a83078
#@name="0. Inbox",
#@path_lower="/mas/0. inbox",
#@path_display="/MAS/0. Inbox",
#@id="id:2O6zWFV84moAAAAAAAB9NA",
#@sharing_info=#<DropboxApi::Metadata::FolderSharingInfo:0x007fdb80a82d30
#@read_only=false,
#@parent_shared_folder_id="4162271984",
#@shared_folder_id=nil>>

#<DropboxApi::Metadata::File:0x007fdb80a28a88
#@name="Formulario para incluir nuevos miembros al directorio.mp4",
#@path_lower="/mas/0. inbox/1. info mas - team/9. dashboard/formulario para incluir nuevos miembros al directorio.mp4",
#@path_display="/MAS/0. INBOX/1. Info MAS - Team/9. Dashboard/Formulario para incluir nuevos miembros al directorio.mp4",
#@id="id:VtZZdbDqCFgAAAAAAABKMA",
#@client_modified=2021-05-13 17:20:53 UTC,
#@server_modified=2021-05-13 18:08:20 UTC,
#@rev="5c23a032e518cf8173af0",
#@size=3785613,
#@content_hash="060b7d0d6aec3ea9eeb0d3d402a7e615aa3315f05c11d5d8aba7833c6b835752",
#@media_info=nil,
#@has_explicit_shared_members=nil>
