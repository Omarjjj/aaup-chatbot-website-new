import React, { useEffect, useRef, useState } from 'react';

const CustomCursor = () => {
  const cursorRef = useRef(null);
  const cursorTrailRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  
  useEffect(() => {
    // Variables for cursor movement
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    
    // Array to store trail positions
    const trailPositions = [];
    const numTrailPoints = 12;
    
    // Initialize trail positions
    for (let i = 0; i < numTrailPoints; i++) {
      trailPositions.push({ x: 0, y: 0 });
    }
    
    // Smooth cursor movement function
    function updateCursor() {
      currentX += (targetX - currentX) * 0.2;
      currentY += (targetY - currentY) * 0.2;
      
      if (cursorRef.current) {
        cursorRef.current.style.left = `${currentX}px`;
        cursorRef.current.style.top = `${currentY}px`;
      }
      
      // Update trail positions
      trailPositions.pop();
      trailPositions.unshift({ x: currentX, y: currentY });
      
      // Create trail path
      let pathData = `M ${trailPositions[0].x} ${trailPositions[0].y}`;
      for (let i = 1; i < trailPositions.length; i++) {
        const point = trailPositions[i];
        pathData += ` L ${point.x} ${point.y}`;
      }
      
      // Update trail SVG
      if (cursorTrailRef.current) {
        cursorTrailRef.current.innerHTML = `
          <svg style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none;">
            <defs>
              <linearGradient id="trailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:rgba(255, 80, 110, 0.8)"/>
                <stop offset="100%" style="stop-color:rgba(255, 80, 110, 0.1)"/>
              </linearGradient>
            </defs>
            <path d="${pathData}" fill="none" stroke="url(#trailGradient)" stroke-width="3" />
          </svg>
        `;
      }
      
      requestAnimationFrame(updateCursor);
    }
    
    // Track mouse movement
    const handleMouseMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      setPosition({ x: e.clientX, y: e.clientY });
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    // Add hover effect for interactive elements
    const interactiveElements = document.querySelectorAll('a, button, input, select, .event-card');
    
    const handleMouseEnter = () => {
      setIsHovering(true);
    };
    
    const handleMouseLeave = () => {
      setIsHovering(false);
    };
    
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });
    
    // Start animation loop
    const animationFrame = requestAnimationFrame(updateCursor);
    
    // Clean up event listeners on component unmount
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      interactiveElements.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
      cancelAnimationFrame(animationFrame);
    };
  }, []);
  
  // Add the styles directly in the head
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Hide default cursor on everything */
      html, body, * {
        cursor: none !important;
      }

      .cursor {
        width: 8px;
        height: 8px;
        background: #ff506e;
        border-radius: 50%;
        position: fixed;
        pointer-events: none;
        z-index: 99999;
        transform: translate(-50%, -50%);
        transition: width 0.2s, height 0.2s;
        box-shadow: 0 0 5px rgba(255, 80, 110, 0.5);
      }

      .cursor-trail {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 99998;
        overflow: hidden;
      }

      .cursor-hover {
        width: 16px;
        height: 16px;
        background: rgba(255, 80, 110, 0.6);
      }

      /* Media query for mobile devices - disable custom cursor */
      @media (max-width: 768px) {
        html, body, * {
          cursor: auto !important;
        }
        
        .cursor, .cursor-trail {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return (
    <>
      <div ref={cursorRef} className={`cursor ${isHovering ? 'cursor-hover' : ''}`}></div>
      <div ref={cursorTrailRef} className="cursor-trail"></div>
    </>
  );
};

export default CustomCursor; 