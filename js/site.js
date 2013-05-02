var map = L.map('map', { });
if (location.hash) {
    var h = location.hash.substr(1).split('/');
    map.setView([h[1], h[2]], h[0]);
} else {
    map.setView([37.7, -97.3], 16);
}

var layer = null;
map.attributionControl.setPrefix('');
L.hash(map);
L.tileLayer('http://a.tiles.mapbox.com/v3/tmcw.map-l1m85h7s/{z}/{x}/{y}.png', {
        attribution: "<a target='_blank' href='http://www.openstreetmap.org/copyright' style='background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAMAAACelLz8AAAB11BMVEXZ2dlkZGT///////////8mJibIyMj5+fm6urr///8sLCywsLBJSUn///9eXl7////////j4+P////////Q0ND////u7u7i4uIfHx/s7OxmZmZzc3P39/fw8PDg4OD5+fmNjY1cXFz5+flQUFBGRkaIiIhtbW3///////9hYWHS0tKlpaWsrKzZ2dmgoKCpqalycnLg4OCCgoJLS0tEREQlJSX9/f3///8/Pz/e3t4jIyP///////////+/v7+Ghobp6enDw8Pl5eVXV1f////////U1NT////////////////l5eW1tbX///+4uLj////////////////////////////w8PDNzc3GxsYuLi7w8PD///////9paWmvr6/c3NwhISHe3t5UVFQfHx/y8vLn5+d3d3eXl5f////09PTs7Oz///8zMzN8fHz///+UlJT////////u7u44ODj////p6en///86Ojqurq5ZWVlfX1////////8hISFBQUGioqIlJSXV1dV6enoqKioxMTH39/eLi4s4ODj///9ra2ubm5v9/f3Nzc28vLz///9LS0v///////////+FhYUdHR3////X19cjIyM2Njaenp7///8AAAAbGxtl93oXAAAAnXRSTlNzcE9udnpweG9Gem50TnI9Z3VgbHEWeHR9dnBvendzfG5ye3N0b3A4I3Fxbm5ybm5wdG5zdXt0NHVze14eMW9udW90cld4cUdSFx11bnJvHG1ANj8VQnlwcHl4H1xwb3N8dHN8eXZvbnV5d0t4byluAyd3dwt2VnZucnEvCn11bnxyb3p4e252BHBufXFvYnRzZQxvfWpyfHdufQB9fOn/1AAAAY5JREFUKM+V0mVvwzAQBuCMmZmZmZmZmZmZGcpMa7ukWXK5H7ukVbOpmqbt/WDZfiRLdz6C+8oqAPh6+8BqnANaOI74RoASydLisnzRdiGt9yQa9pVglC7LYws8advLTxEWoJaGx1x6ksx/LdQetI5R55xIE4O2+yvhwZDgwxUaobDh1kn6F/ud9vSMBu3p5lLgycqGAZosjneCe52zLTyjEB17DRAdERkva0Rk34h3x+gNinmy7FqyKOcWiDcWfw4QgL+TXC2sH8yOJ9V1AXRaUZmdkZqCALX4APDhotKjbcZ8LDkyoiyBp3I0ipRWgVgDORu768mJCFt3uEe4SXPA1wRFqgPatEVBJpyZSDcpFBR2mKzFubgGN5BfpjEb3GTVdJtNRqrq+DE9aQcMJFSKhIyW7UFsri7JUyHJqMhNhqT+UPL/iO+8ix4e5y1P38A6zv+X0Pln89jU7LT9mtU575mLkcmZV47/r/Y9+4temIKhARutVO/3H54Mc87ZuG1rFQfn8uq+r/dc7zp8AmmAXy4xp9xiAAAAAElFTkSuQmCC) no-repeat; background-size:26px 26px;width:24px;height:24px;display:block;z-index:1000;bottom:2px;right:5px;bottom:5px;position:absolute;'></a>"
    })
    .addTo(map);

function updateMap() {
    if (map.getZoom() > 13) {
        d3.select('#map').classed('faded', true);
        d3.select('#zoom-in').classed('hide', true);
        d3.select('#results').classed('hide', false);
        run();
    } else {
        d3.select('#map').classed('faded', true);
        d3.select('#zoom-in').classed('hide', false);
        d3.select('#results').classed('hide', true);
        layer && map.removeLayer(layer);
        layer = null;
    }
}

updateMap();

function run() {
    var bounds = map.getBounds();
    d3.xml('http://www.openstreetmap.org/api/0.6/map?bbox=' +
        bounds.getSouthWest().lng + ',' +
        bounds.getSouthWest().lat + ',' +
        bounds.getNorthEast().lng + ',' +
        bounds.getNorthEast().lat // + ',' +
        ).on('load', function(xml) {
            d3.select('#map').classed('faded', false);
            layer && map.removeLayer(layer);

            layer = new L.OSM.DataLayer(xml).addTo(map);

            var bytime = [];
            var changesets = {};

            layer.eachLayer(function(l) {
                changesets[l.feature.changeset] = changesets[l.feature.changeset] || {
                    id: l.feature.changeset,
                    time: new Date(l.feature.timestamp),
                    user: l.feature.user,
                    comment: '',
                    features: []
                };
                changesets[l.feature.changeset].features.push(l);
            });
            for (var k in changesets) {
                bytime.push(changesets[k]);
            }

            layer.on('click', function(e) {
                click({ feature: e.layer });
            });

            bytime.sort(function(a, b) {
                return (+b.time) - (+a.time);
            });

            var datescale = d3.time.scale()
                .domain(d3.extent(bytime.map(function(b) { return b.time; })))
                .range([0, 1]);

            var colint = d3.interpolateRgb('#000', '#f00');
            var results = d3.select('#results');
            var allresults = results
                .selectAll('div.result')
                .data(bytime, function(d) {
                    return d.id;
                })
                .attr('class', 'result')
                .style('color', function(l) {
                    return colint(datescale(l.time));
                });
            allresults.exit().remove();

            var rl = allresults.enter()
                .append('div')
                .attr('class', 'result')
                .style('color', function(l) {
                    return colint(datescale(l.time));
                });
            allresults.order();

            function click(d) {
                results
                    .selectAll('div.result')
                    .classed('active', function(_) {
                        return _.id == (d.id || d.feature.feature.changeset);
                });
                resetStyle();
                var id = d.id ? d.id : d.feature.feature.changeset;
                layer.eachLayer(function(l) {
                    if (l.feature.changeset == id) {
                        l.setStyle({ color: '#0f0' });
                    }
                });
                if (d3.event) d3.event.preventDefault();
            }

           rl.append('a').classed('load', true).html('&rarr; ').attr('href', '#')
           .on('click', click);

           rl.append('a').text(function(d) {
               return d.user + ' ';
           })
           .attr('target', '_blank')
           .attr('href', function(d) {
               return 'http://openstreetmap.org/user/' + d.user;
           });

           rl.append('span').attr('class', 'date').text(function(d) {
               return moment(d.time).format('MMM Do YYYY, h:mm:ss a ');
           });

           rl.append('div').attr('class', 'changeset').each(function(d) {
               var t = this;
               d3.xml('http://www.openstreetmap.org/api/0.6/changeset/' + d.id)
                   .on('load', function(xml) {
                       d3.select(t).html(
                           '<a href="http://openstreetmap.org/browse/changeset/' + d.id + '" target="_blank">' +
                           (L.OSM.getTags(xml).comment || '<div class="no-comment">&ndash;</div>') +
                           '</a>'
                       );
                   })
                   .get();
               });

           function resetStyle() {
               layer.eachLayer(function(l) {
                   l.setStyle({
                       color: colint(datescale(new Date(l.feature.timestamp))),
                       opacity: 0.4,
                       weight: 6
                   });
               });
           }

           resetStyle();

    }).get();
}
var timeOutId = 0
map.on('moveend', function() {
    clearTimeout(timeOutId);
    timeOutId = setTimeout(updateMap, 500);
});
