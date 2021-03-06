window.name = 'NG_ENABLE_DEBUG_INFO!';

var urlServer = "https://mendelssohntw.github.io/robot.tw2/app/";

if (!window.inject){
	window.inject = function inject(url) {
		try {
			var r = Math.round(Math.random() * 1e10)
			var scr = document.createElement("script");
			scr.type = "text/javascript";
			if(typeof(urlServer) == "string") {
				scr.src = url + '?' + r;
			} else {
				scr.src = chrome.extension.getURL(url);
			}
			(document.head || document.body || document.documentElement).appendChild(scr);
		} catch (error) {
			setTimeout(function(){inject(url)}, 3000)
		}
	};
}

if (!window.check){
	window.check = function () {
		if (document.getElementById("interface-bottom")) {
			var r = Math.round(Math.random() * 1e10)
			var scr = document.createElement("link");
			scr.setAttribute("rel", "stylesheet");
			scr.setAttribute("type", "text/css");
			scr.setAttribute("href", urlServer + "css/robotTW2.css" + '?' + r);
			document.head.appendChild(scr);

			inject(urlServer + "twtwotools.js")

		} else {
			setTimeout(check, 1000);
		}
	}
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", check);
} else {
	check();
}


