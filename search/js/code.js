const qs = new QS(list, ["name","path"]);


var CS = { //Cloud Search
	isNavigational: (e) => {
		return (e.code == 'ArrowDown') || (e.code == 'ArrowUp') || (e.code == 'Enter');
	},
	detectFileType: (name) => {
		var result = 'file';
		if(name.match(/xlsx?$/)) 		{ result = 'excel' }
		else if(name.match(/docx?$/))	{ result = 'word' }
		else if(name.match(/pppt$/)) 	{ result = 'powerpoint' }
		else if(name.match(/pdf$/)) 	{ result = 'pdf' }
		return result;
	},

	hilite:{
		matches: (text, query, positions) => {
			var result = "", lastEnd = 0, extraMatches = CS.hilite.extraMatches;

			positions.map( (pos) => { var [start, end] = pos;
				result += extraMatches(text.substring(lastEnd, start), query)+
					'<b>'+text.substring(start, end)+'</b>'
				if(end > lastEnd) { lastEnd = end; }
			});
			return result += 
				extraMatches(text.substring(lastEnd, text.length), query);
		},
		extraMatches: (text, query) => { 
				var regex = new RegExp('('+query+')','ig');
				return text.replace(regex,"<b>$1</b>")
			},
		all:(text, query, positions) => {
			var hilited =  CS.hilite.matches( text, query.replace(/\//,''), positions );
			hilited = hilited.replace(/([^<])\//g, '$1|'); // map < not from a tag to |
			var path = hilited.replace(/(\|?)([^|]+\|?)$/,''), //delete name from path
				name = hilited.replace(/(.*\|)([^|]+\|?)$/,'$2'). //delete everything but the name
					replace(/\.(docx?|xlsx?|ppt|pdf)/i,'').replace(/\|/,'');
			return [path, name]
		}
	},

	count: {
		slashes: (str) => {
			return CS.count.matches( str, /\//g);
		} ,
		matches: (str, regex) => {
			return ((str || '').match(regex) || []).length;
		}
	},
	log: (onOff, result) => {
		if(onOff) {
			return '<span class="score">'+result.score.toFixed(4)+' | '+result.slashes+'</span>';
		} else {
			return '';
		}
	},

	path: {
		root: "https://www.dropbox.com/home/MAS/",
		splitLink: (path, url) =>  {
			var subpaths = path.split('|'),
				suburls = url.split('/'),
				result = "",
				root = CS.path.root,
				slash = '<i>/</i>';

			subpaths.forEach( (subpath, i) => {
				//console.log('suburls:'+suburls.slice(0, i).join("/"));
				result += '<a href="'+root+suburls.slice(0, i+1).join("/")+'" target="_blank">'+
					subpath+'</a>' + slash;
			});
			return result;
		}
	},
	//from: https://stackoverflow.com/questions/18177174/how-to-limit-handling-of-event-to-once-per-x-seconds-with-jquery-javascript
	debounce: function(func, interval) {
		var lastCall = -1;
		return function() {
			clearTimeout(lastCall);
			var args = arguments;
			var self = this;
			lastCall = setTimeout(function() {
				func.apply(self, args);
			}, interval);
		};
	},

	keyup: function(e) {
		if( CS.isNavigational(e) ) { return; };
		var query = $(this).val(),
			queryIsSignature = query.match("_"),
			signature = (query.match(/_\w\w\w?/)||['_'])[0]
			allResults = qs.search(query).
				filter(match => match.score > 0.4).
				map(match => {
					var item = match.item,
						slashes = CS.count.slashes( item.path );
					match.score -= slashes*0.05;
					match.score += (item.type == "dir") ? 0.1 : 0;
					match.score += item.path.match(query) ? 0.2 : 0;
					match.score += (queryIsSignature && item.name.match(signature)) ? 0.2 : 0
					match.slashes = slashes;
					return match;
				}).
				sort((a,b)=> b.score - a.score),
				//sort((a,b)=> a.item.path.length - b.item.path.length),
			topResults = allResults.slice(0,20),
			out = "";

		topResults.map( (result, i) => { 
			var { path, type, name, time } = result.item;
			var [hilitedPath, hilitedName] = CS.hilite.all( path, query, result.matches.path );

			out += '<div class="result'+(i == 0 ? ' selected' : '')+'">' +
				'<div class="name">'+
					'<a href="'+CS.path.root + path+'" target="_blank">' + 
						hilitedName  +
						'<img src="img/icon/'+
							(type=='dir' ? 'folder' : 
								CS.detectFileType( name )) +
							'.png"></img>'+ 
					'</a>'+
					CS.log( false, result ) +
				'</div><div class="path">'+
					CS.path.splitLink( hilitedPath, path )+
				'</div></div>';
		});
		$('#search').data('lastQuery', query);
		$(".results").html( out );
	},
	keydown: function(e) {
		if( CS.isNavigational(e) ) {
			var length = $('.results div').length,
				sel = $('.results div.selected'),
				i = sel.index();

			if( (e.code == 'ArrowDown') && (i < length - 1) ) {
				sel.removeClass('selected').
					next().addClass('selected');
			} else if( (e.code == 'ArrowUp') && (i > 0) ) {
				sel.removeClass('selected').
					prev().addClass('selected');
			} else if( (e.code == 'Enter') ) {
				window.open( sel.find('a').attr('href'), '_blank');
			}
		}
	},
	init: function() {
		$("#search").focus().keyup( CS.debounce(CS.keyup, 500) ).keyup()
		$(window).keydown( CS.keydown );
	}
};

$( document ).ready(function() {
	CS.init()
});
