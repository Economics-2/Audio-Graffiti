
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraffitiPin, UserLocation } from '../types';

interface MapViewProps {
  pins: GraffitiPin[];
  userLoc: UserLocation | null;
  onSelectPin: (pin: GraffitiPin) => void;
}

const MapView: React.FC<MapViewProps> = ({ pins, userLoc, onSelectPin }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !userLoc) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const projection = d3.geoMercator()
      .center([userLoc.longitude, userLoc.latitude])
      .scale(3500000) 
      .translate([width / 2, height / 2]);

    const g = svg.append("g");

    // Grid pattern
    const gridSize = 50;
    for(let x = 0; x < width; x += gridSize) {
        g.append("line").attr("x1", x).attr("y1", 0).attr("x2", x).attr("y2", height).attr("stroke", "#1e293b").attr("stroke-width", 0.5);
    }
    for(let y = 0; y < height; y += gridSize) {
        g.append("line").attr("x1", 0).attr("y1", y).attr("x2", width).attr("y2", y).attr("stroke", "#1e293b").attr("stroke-width", 0.5);
    }
    
    // User marker
    const userPoint = projection([userLoc.longitude, userLoc.latitude]);
    if (userPoint) {
        g.append("circle")
            .attr("cx", userPoint[0])
            .attr("cy", userPoint[1])
            .attr("r", 20)
            .attr("fill", "none")
            .attr("stroke", "#06b6d4")
            .attr("stroke-width", 1)
            .attr("opacity", 0.5)
            .append("animate")
            .attr("attributeName", "r")
            .attr("values", "10;30;10")
            .attr("dur", "3s")
            .attr("repeatCount", "indefinite");

        g.append("circle")
            .attr("cx", userPoint[0])
            .attr("cy", userPoint[1])
            .attr("r", 6)
            .attr("fill", "#06b6d4")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);
    }

    // Pins
    pins.forEach(pin => {
      const pinPoint = projection([pin.longitude, pin.latitude]);
      if (pinPoint) {
        const pinGroup = g.append("g")
            .attr("class", "cursor-pointer")
            .on("click", () => onSelectPin(pin));

        pinGroup.append("circle")
          .attr("cx", pinPoint[0])
          .attr("cy", pinPoint[1])
          .attr("r", 8)
          .attr("fill", "#ec4899")
          .attr("stroke", "#fff")
          .attr("stroke-width", 1)
          .attr("filter", "drop-shadow(0 0 5px rgba(236, 72, 153, 0.5))");

        pinGroup.append("text")
          .attr("x", pinPoint[0])
          .attr("y", pinPoint[1] + 20)
          .text(pin.title.toUpperCase())
          .attr("fill", "white")
          .attr("font-size", "8px")
          .attr("font-weight", "black")
          .attr("font-family", "monospace")
          .attr("text-anchor", "middle");
      }
    });

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => g.attr("transform", event.transform));

    svg.call(zoom);

  }, [pins, userLoc, onSelectPin]);

  return (
    <div className="w-full h-full bg-slate-950 relative overflow-hidden">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute top-6 left-6 pointer-events-none">
        <h3 className="text-xl font-black italic text-cyan-500 leading-none">SECTOR_MAP</h3>
        <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mt-1">Satellite Link established</p>
      </div>
      
      {/* Decorative corner accents */}
      <div className="absolute top-0 right-0 w-24 h-24 border-r-2 border-t-2 border-slate-800 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 border-l-2 border-b-2 border-slate-800 pointer-events-none"></div>
    </div>
  );
};

export default MapView;
