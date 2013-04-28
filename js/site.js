var map = L.map('map', { });
if (location.hash) {
    var h = location.hash.substr(1).split('/');
    map.setView([h[1], h[2]], h[0]);
} else {
    map.setView([37.7, -97.3], 16);
}

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
                .attr('class', 'result');
            allresults.order();

            function click(d) {
                results
                    .selectAll('div.result')
                    .classed('active', function(_) {
                        return _.id == (d.id || d.feature.feature.changeset);
                });
                resetStyle();
                var id = d.id ? d.id : d.feature.feature.changeset;
                var features = changesets[id].features;
                for (var i = 0; i < features.length; i++) {
                    // Why does this not highlight objects on pane?
                    features[i].setStyle({ color: '#0f0' });
                }
                if (d3.event) d3.event.preventDefault();
            }

           rl.append('a').classed('load', true).html('&larr; ').attr('href', '#')
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
                       opacity: 0.8
                   });
               });
           }

           resetStyle();

    }).get();
}
map.on('moveend', updateMap);
