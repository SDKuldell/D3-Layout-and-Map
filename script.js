d3.json("airports.json", d3.autoType).then((airports) => {
  d3.json("world-110m.json", d3.autoType).then((worldMap) => {
    console.log(airports);
    console.log(worldMap);

    const margin = { top: 0, left: 0, right: 0, bottom: 0 };
    const totalWidth = 960;
    const totalHeight = 500;
    const width = totalWidth - margin.left - margin.right,
      height = totalHeight - margin.top - margin.bottom;

    const svg = d3
      .select("body")
      .append("svg")
      .attr("width", totalWidth)
      .attr("height", totalHeight)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const passengerScale = d3
      .scaleLinear()
      .domain([0, d3.max(airports.nodes, (d) => d.passengers)])
      .range([0, 15]);

    const features = topojson.feature(worldMap, worldMap.objects.countries);
    console.log("features", features);

    const projection = d3.geoMercator().fitExtent(
      [
        [0, 0],
        [width, height],
      ],
      features
    );
    const path = d3.geoPath().projection(projection);

    svg
      .selectAll("path")
      .data(features.features) // geojson feature collection
      .join("path")
      .attr("d", (d) => path(d))
      .style("opacity", 0);

    svg
      .append("path")
      .datum(topojson.mesh(worldMap, worldMap.objects.countries))
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("class", "subunit-boundary")
      .style("opacity", 0);

    const force = d3
      .forceSimulation(airports.nodes)
      .force("charge", d3.forceManyBody())
      .force("link", d3.forceLink(airports.links))
      .force("xAxis", d3.forceX(width / 2))
      .force("yAxis", d3.forceY(height / 2));

    var edges = svg
      .selectAll("line")
      .data(airports.links)
      .enter()
      .append("line")
      .style("stroke", "gray")
      .style("stroke-width", 1);

    var nodes = svg
      .selectAll("circle")
      .data(airports.nodes)
      .enter()
      .append("circle")
      .attr("r", function (d, i) {
        return passengerScale(d.passengers);
      })
      .style("fill", "orange")
      .call(drag(force));

    nodes.append("title").text((d) => d.name);

    force.on("tick", function () {
      // update positions
      edges
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      nodes.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    });

    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3
        .drag()
        .filter((event) => visType === "Force")
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    let visType = "Force";

    d3.selectAll("input[name=selection]").on("change", (event) => {
      visType = event.target.value; // selected button
      console.log(visType);
      switchLayout();
    });

    function switchLayout() {
      if (visType === "Map") {
        // stop the simulation
        force.stop();
        // set the positions of links and nodes based on geo-coordinates

        edges
          .transition()
          .duration(1000)
          .attr(
            "x1",
            (d) => projection([d.source.longitude, d.source.latitude])[0]
          )
          .attr(
            "y1",
            (d) => projection([d.source.longitude, d.source.latitude])[1]
          )
          .attr(
            "x2",
            (d) => projection([d.target.longitude, d.target.latitude])[0]
          )
          .attr(
            "y2",
            (d) => projection([d.target.longitude, d.target.latitude])[1]
          );

        nodes
          .transition()
          .duration(1000)
          .attr("cx", (d) => projection([d.longitude, d.latitude])[0])
          .attr("cy", (d) => projection([d.longitude, d.latitude])[1]);

        // set the map opacity to 1
        svg.selectAll("path").transition().duration(1000).style("opacity", 1);
      } else {
        // force layout
        edges
          .transition()
          .duration(1000)
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

        nodes
          .transition()
          .duration(1000)
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y)
          .on("end", restart);
        // restart the simulation
        function restart() {
          force.restart();
        }

        // set the map opacity to 0
        svg.selectAll("path").transition().duration(1000).style("opacity", 0);
      }
    }
  }); //end data
});
