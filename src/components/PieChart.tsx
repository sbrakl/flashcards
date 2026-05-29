'use client';

import React, { useState } from 'react';

interface PieChartProps {
  ratings: number[]; // Array of ratings given in the session, e.g. [5, 4, 3, 5, 2]
}

interface SliceData {
  rating: number;
  label: string;
  count: number;
  percentage: number;
  color: string;
  startAngle: number;
  endAngle: number;
}

export default function PieChart({ ratings }: PieChartProps) {
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  const total = ratings.length;
  if (total === 0) {
    return (
      <div className="empty-state" style={{ padding: '2rem' }}>
        <p className="empty-subtitle">No ratings recorded for this session.</p>
      </div>
    );
  }

  // Count frequencies
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach((r) => {
    if (counts[r] !== undefined) {
      counts[r]++;
    }
  });

  const ratingColors: Record<number, string> = {
    1: '#ef4444', // Red
    2: '#f97316', // Orange
    3: '#eab308', // Yellow
    4: '#22c55e', // Green
    5: '#06b6d4', // Cyan
  };

  const ratingLabels: Record<number, string> = {
    1: 'Very Poor',
    2: 'Poor',
    3: 'Average',
    4: 'Good',
    5: 'Very Good',
  };

  // Calculate slices
  let accumulatedPercent = 0;
  const slices: SliceData[] = [];

  for (let r = 1; r <= 5; r++) {
    const count = counts[r];
    if (count > 0) {
      const percentage = (count / total) * 100;
      const startAngle = accumulatedPercent * 3.6; // 360 / 100
      accumulatedPercent += percentage;
      const endAngle = accumulatedPercent * 3.6;

      slices.push({
        rating: r,
        label: ratingLabels[r],
        count,
        percentage,
        color: ratingColors[r],
        startAngle,
        endAngle,
      });
    }
  }

  const averageRating = (
    ratings.reduce((sum, val) => sum + val, 0) / total
  ).toFixed(1);

  // Helper to generate SVG arc path
  const getCoordinatesForPercent = (angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: 100 + 70 * Math.cos(angleInRadians),
      y: 100 + 70 * Math.sin(angleInRadians),
    };
  };

  const describeArc = (startAngle: number, endAngle: number) => {
    // If it's a full circle, SVG arcs can break. Adjust slightly.
    const isFullCircle = endAngle - startAngle >= 360;
    const adjustedEndAngle = isFullCircle ? endAngle - 0.01 : endAngle;

    const start = getCoordinatesForPercent(startAngle);
    const end = getCoordinatesForPercent(adjustedEndAngle);
    const largeArcFlag = adjustedEndAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', 100, 100,
      'L', start.x, start.y,
      'A', 70, 70, 0, largeArcFlag, 1, end.x, end.y,
      'Z'
    ].join(' ');
  };

  return (
    <div className="pie-chart-container">
      <div style={{ position: 'relative', width: '220px', height: '220px' }}>
        <svg
          viewBox="0 0 200 200"
          width="220"
          height="220"
          className="pie-chart-svg"
        >
          {/* Slices */}
          {slices.map((slice) => {
            const isHovered = hoveredSlice === slice.rating;
            const pathData = describeArc(slice.startAngle, slice.endAngle);

            return (
              <path
                key={slice.rating}
                d={pathData}
                fill={slice.color}
                opacity={hoveredSlice !== null && !isHovered ? 0.6 : 0.9}
                className="pie-slice"
                style={{
                  transformOrigin: '100px 100px',
                  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
                }}
                onMouseEnter={() => setHoveredSlice(slice.rating)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            );
          })}

          {/* Central hole (Donut chart effect) */}
          <circle cx="100" cy="100" r="45" fill="#12131e" />

          {/* Center text indicating overall statistics */}
          <g style={{ transform: 'rotate(90deg)', transformOrigin: '100px 100px' }}>
            <text x="100" y="90" className="pie-center-text" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {averageRating}
            </text>
            <text x="100" y="115" className="pie-center-text" style={{ fontSize: '0.65rem', fill: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Avg Rating
            </text>
          </g>
        </svg>
      </div>

      <div className="chart-legend">
        {[1, 2, 3, 4, 5].map((r) => {
          const count = counts[r] || 0;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          const active = count > 0;

          return (
            <div
              key={r}
              className="legend-item"
              style={{
                opacity: active ? 1 : 0.35,
                border: hoveredSlice === r ? `1px solid ${ratingColors[r]}` : undefined,
                background: hoveredSlice === r ? 'rgba(255,255,255,0.05)' : undefined,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={() => active && setHoveredSlice(r)}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <div
                className="legend-dot"
                style={{ backgroundColor: ratingColors[r] }}
              />
              <span>Rating {r}</span>
              {active && (
                <span className="legend-count">
                  {count} ({percentage}%)
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
