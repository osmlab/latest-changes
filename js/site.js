var map = L.map('map', { });
var layer = null;

L.hash(map);

L.tileLayer('http://a.tiles.mapbox.com/v3/tmcw.map-l1m85h7s/{z}/{x}/{y}.png')
    .addTo(map);

function updateMap() {
    if (map.getZoom() > 13) {
        d3.select('#map').classed('faded', true);
        d3.select('#zoom-in').classed('hide', true);
        run();
    } else {
        d3.select('#map').classed('faded', true);
        d3.select('#zoom-in').classed('hide', false);
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
                    comment: 'todo', // TODO: request from  http://wiki.openstreetmap.org/wiki/API_v0.6#Read:_GET_.2Fapi.2F0.6.2Fchangeset.2F.23id
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

            var rl = d3.select('#results')
                .selectAll('div.result')
                .data(bytime)
                .enter()
                .append('div')
                .attr('class', 'result')
                .style('color', function(l) {
                    return colint(datescale(l.time));
                });

            function click(d) {
                rl.classed('active', function(_) {
                    return d == _;
                });
                resetStyle();
                d.feature.setStyle({ color: '#0f0' });
                if (d3.event) d3.event.preventDefault();
            }

           rl.append('a').classed('load', true).html('&larr; ').attr('href', '#')
           .on('click', click);
           rl.append('span').classed('deemphasize', true).text('edited ');

           rl.append('span').text(function(d) {
               return moment(d.time).format('MMM Do YYYY, h:mm:ss a ');
           });

           rl.append('span').classed('deemphasize', true).text('by ');

           rl.append('a').text(function(d) {
               return d.user + ' ';
           })
           .attr('target', '_blank')
           .attr('href', function(d) {
               return 'http://openstreetmap.org/user/' + d.user;
           });

           rl.append('a').attr('class', 'l changeset-link').text(function(d) {
               return 'changeset';
           })
           .attr('target', '_blank')
           .attr('href', function(d) {
               return 'http://openstreetmap.org/browse/changeset/' + d.id;
           });

           function resetStyle() {
               layer.eachLayer(function(l) {
                   l.setStyle({
                       color: colint(datescale(new Date(l.feature.timestamp))),
                       opacity: 0.8
                   });
               });
           }

           resetStyle();

    }).get();
}
map.on('moveend', updateMap);
