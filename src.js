// ==UserScript==
// @id             iitc-plugin-KMLExport
// @name           IITC plugin: show list of portals and export it to KML
// @category       Info
// @version        0.1
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://github.com/jonatkins/ingress-intel-total-conversion
// @downloadURL    https://github.com/jonatkins/ingress-intel-total-conversion
// @description    [drjest-2014-11-21-210207] Display a list of all visible portals in map or inside a polygon and Export Them To KML
// @include        https://www.ingress.com/intel*
// @include        http://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};
    // PLUGIN START ////////////////////////////////////////////////////////
    // use own namespace for plugin
    window.plugin.toKML = function() {};
    window.plugin.toKML.listPortals = [];
    
    //fill the listPortals array with portals avaliable on the map (level filtered portals will not appear in the table)
    window.plugin.toKML.getPortals = function(polygon) {
        var displayBounds = map.getBounds();
        window.plugin.toKML.listPortals = [];
        for (var i in window.portals) {
            var portal = window.portals[i];
            if(displayBounds.contains(portal.getLatLng()) && window.plugin.toKML.polygon.contains(polygon, portal))
                window.plugin.toKML.listPortals.push(portal);
        }
        return (window.plugin.toKML.listPortals.length>0);
    };
    
    window.plugin.toKML.generateKML = function(lvltitle) {
        var markers = window.plugin.toKML.markers;
        var opt = [   "<?xml version='1.0' encoding='UTF-8'?>",
                      "<kml xmlns='http://www.opengis.net/kml/2.2'>",
                      "   <Document>",
                      "       <name>Monza - Portali</name>",
                      "       <description><![CDATA[]]></description>",
                      "       <Folder>",
                      "           <name>"+lvltitle+"</name>"
                  ].join("\n") + "\n";
        var g=function(marker) {
              return ["           <Placemark>",
                      "               <styleUrl>#icon-503-DB4436</styleUrl>",
                      "               <name>"+marker.title+"</name>",
                      "               <ExtendedData>",
                      "               </ExtendedData>",
                      "               <Point>",
                      "                   <coordinates>"+marker.lon+","+marker.lat+",0.0</coordinates>",
                      "               </Point>",
                      "           </Placemark>"
                      ].join("\n");
        };
        for (var i in markers)
            opt += g(markers[i])+"\n";
        opt += [      "   </Folder>",
                      "       <Style id='icon-503-DB4436'>",
                      "           <IconStyle>",
                      "               <color>ff3644DB</color>",
                      "               <scale>1.1</scale>",
                      "               <Icon>",
                      "                   <href>http://www.gstatic.com/mapspro/images/stock/503-wht-blank_maps.png</href>",
                      "               </Icon>",
                      "           </IconStyle>",
                      "       </Style>",
                      "   </Document>",
                      "</kml>"
                ].join("\n");
        return opt;
    };
    
    window.plugin.toKML.markers = [];
    
    window.plugin.toKML.displayPL = function(poly) {
        var list, ul;
        if (window.plugin.toKML.getPortals(poly)) {
            ul = $("<ul>").css({float:"left",maxWidth:"49%"});
            window.plugin.toKML.markers = [];
            for(var i in window.plugin.toKML.listPortals) {
                var portal = window.plugin.toKML.listPortals[i],
                    name = portal.options.data.title,
                    lat = portal.getLatLng().lat,
                    lon = portal.getLatLng().lon;
                window.plugin.toKML.markers.push({ title: name, lat: lat, lon: lon });
                $("<li>").text(name).appendTo(ul);
            }
            
            var KML = window.plugin.toKML.generateKML("Livello senza Titolo");
            list = $('<div>Portal List</div>').append(ul);
            $('<textarea>').attr("readonly","false").attr("id","exkml").css({ width:"50%", minHeight:400, float: 'right' }).html(KML).appendTo(list);
        } else {
            list = $('<table class="noPortals"><tr><td>Nothing to show!</td></tr></table>');
        }
        if(window.useAndroidPanes()) {
            $('<div id="toKML" class="mobile">').append(list).appendTo(document.body);
        } else {
            dialog({
                html: list.html(),
                dialogClass: 'ui-dialog-toKML',
                title: 'Export: ' + window.plugin.toKML.listPortals.length + ' ' + (window.plugin.toKML.listPortals.length == 1 ? 'portal' : 'portals'),
                id: 'export-list',
                width: 700
            });
        }
    };
        
    window.plugin.toKML.getPortalLink = function(portal) {
        var coord = portal.getLatLng();
        var perma = '/intel?ll='+coord.lat+','+coord.lng+'&z=17&pll='+coord.lat+','+coord.lng;
        var link = document.createElement("a");
        link.textContent = portal.options.data.title;
        link.href = perma;
        link.addEventListener("click", function(ev) {
            renderPortalDetails(portal.options.guid);
            ev.preventDefault();
            return false;
        }, false);
        link.addEventListener("dblclick", function(ev) {
            zoomToAndShowPortal(portal.options.guid, [coord.lat, coord.lng]);
            ev.preventDefault();
            return false;
        });
        return link;
    };
        
    window.plugin.toKML.onPaneChanged = function(pane) {
        if(pane == "plugin-toKML")
            window.plugin.toKML.displayPL();
        else
            $("#toKML").remove();
    };
        
    window.plugin.toKML.polygon = {
        getByPath: function(path) {
            if(!window.plugin.drawTools)
                return false;
            var l = window.plugin.drawTools.drawnItems._layers;
            for (var i in l) {
                if(l[i]._path==path)
                    return l[i];
            }
            return false;
        },
        export: function(path) {
            var poly = window.plugin.toKML.polygon.getByPath(path);
            window.plugin.toKML.displayPL(poly);
        },
        contains: function(poly, portal) {
            if(poly===undefined) return true;
            var vs = poly._latlngs;
            var x = portal.getLatLng().lng,
                y = portal.getLatLng().lat;
            
            var inside = false;
            for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
                var xi = vs[i].lng, yi = vs[i].lat;
                var xj = vs[j].lng, yj = vs[j].lat;
                
                var intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            console.log(portal, inside);
            return inside;
        },
        showExportPane: function(event) {
            var path = window.plugin.toKML.currentPoly = event.target;
            $("<div>")
            .css({
                top:event.clientY-2, 
                left:event.clientX-2,
                position: "absolute",
                zIndex: 1858050,
                display: 'block',
                border: "2px solid black",
                background: "rgba(0,0,0,0.7)",
                color: "#FFF",
                padding: 10
            })
            .append($("<a>").text("Export to KML").click(function(){ window.plugin.toKML.polygon.export(path); }))
            .on("mouseleave", function(){ $(this).remove(); })
            .appendTo("body");
        }
    };
    
    var setup =  function() {
        if(window.useAndroidPanes()) {
            android.addPane("plugin-toKML", "Portals list", "ic_action_paste");
            addHook("paneChanged", window.plugin.toKML.onPaneChanged);
        } else {
            $('#toolbox').append('<a onclick="window.plugin.toKML.displayPL()" title="Export a list of portals in the current view">KML Export</a>');
        }
        $("<style>")
        .prop("type", "text/css")
        .html("#toKML.mobile {\n  background: transparent;\n  border: 0 none !important;\n  height: 100% !important;\n  width: 100% !important;\n  left: 0 !important;\n  top: 0 !important;\n  position: absolute;\n  overflow: auto;\n}\n\n#toKML table {\n  margin-top: 5px;\n  border-collapse: collapse;\n  empty-cells: show;\n  width: 100%;\n  clear: both;\n}\n\n#toKML table td, #toKML table th {\n  background-color: #1b415e;\n  border-bottom: 1px solid #0b314e;\n  color: white;\n  padding: 3px;\n}\n\n#toKML table th {\n  text-align: center;\n}\n\n#toKML table .alignR {\n  text-align: right;\n}\n\n#toKML table.portals td {\n  white-space: nowrap;\n}\n\n#toKML table th.sortable {\n  cursor: pointer;\n}\n\n#toKML table .portalTitle {\n  min-width: 120px !important;\n  max-width: 240px !important;\n  overflow: hidden;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n}\n\n#toKML .sorted {\n  color: #FFCE00;\n}\n\n#toKML table.filter {\n  table-layout: fixed;\n  cursor: pointer;\n  border-collapse: separate;\n  border-spacing: 1px;\n}\n\n#toKML table.filter th {\n  text-align: left;\n  padding-left: 0.3em;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n#toKML table.filter td {\n  text-align: right;\n  padding-right: 0.3em;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n#toKML .filterNeu {\n  background-color: #666;\n}\n\n#toKML table tr.res td, #toKML .filterRes {\n  background-color: #005684;\n}\n\n#toKML table tr.enl td, #toKML .filterEnl {\n  background-color: #017f01;\n}\n\n#toKML table tr.none td {\n  background-color: #000;\n}\n\n#toKML .disclaimer {\n  margin-top: 10px;\n  font-size: 10px;\n}\n\n#toKML.mobile table.filter tr {\n  display: block;\n  text-align: center;\n}\n#toKML.mobile table.filter th, #toKML.mobile table.filter td {\n  display: inline-block;\n  width: 22%;\n}\n\n")
        .appendTo("head");
        $('svg').on("mouseup", 'path[fill-opacity="0.2"]', function(e) { 
            window.setTimeout(function(e) {
                if (e.which != 1 || $('.leaflet-draw-tooltip').length) return; 
                window.plugin.toKML.polygon.showExportPane(e); 
            }, 20, e);
        });
    };
    // PLUGIN END //////////////////////////////////////////////////////////
    setup.info = plugin_info; //add the script info data to the function as a property
    if(!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    // if IITC has already booted, immediately run the 'setup' function
    if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end

// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);

