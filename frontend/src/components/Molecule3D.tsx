import { useEffect, useRef } from 'react';

interface Molecule3DProps {
  smiles: string;
  sdf?: string | null;
}

declare global {
  interface Window {
    $3Dmol: any;
  }
}

export default function Molecule3D({ smiles, sdf }: Molecule3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    const initViewer = () => {
      if (containerRef.current && !viewerRef.current && window.$3Dmol) {
        viewerRef.current = window.$3Dmol.createViewer(containerRef.current, {
          backgroundColor: '#000000',
        });
        updateViewer();
      }
    };

    if (window.$3Dmol) {
      initViewer();
    } else {
      const script = document.createElement('script');
      script.src = 'https://3Dmol.org/build/3Dmol-min.js';
      script.async = true;
      script.onload = initViewer;
      document.head.appendChild(script);
    }

    return () => {
      // Don't remove script to prevent re-loads, but we can clean up the viewer
      if (viewerRef.current) {
        // 3Dmol cleanup if needed
      }
    };
  }, []);

  useEffect(() => {
    updateViewer();
  }, [smiles, sdf]);

  const updateViewer = async () => {
    if (!viewerRef.current || !window.$3Dmol) return;

    const viewer = viewerRef.current;
    viewer.clear();

    try {
      if (sdf) {
        // RDKit's get_v3000() returns V3000 SDF
        viewer.addModel(sdf, "sdf");
      } else {
        // Fallback to fetch if no SDF provided (e.g. initial load)
        const response = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/SDF?record_type=3d`);
        if (response.ok) {
          const fetchedSdf = await response.text();
          viewer.addModel(fetchedSdf, "sdf");
        } else {
          // Absolute fallback: mock a carbon atom if it's just 'C' or similar
          if (smiles === 'C' || smiles === '') {
            viewer.addSphere({ center: {x:0,y:0,z:0}, radius: 0.7, color: 'gray' });
          }
        }
      }

      viewer.setStyle({}, { 
        stick: { radius: 0.15, colorscheme: 'brightCarbon' }, 
        sphere: { radius: 0.4, colorscheme: 'brightCarbon' } 
      });
      viewer.zoomTo();
      viewer.render();
    } catch (e) {
      console.error("3D Viewer Error:", e);
    }
  };

  return (
    <div 
      className="w-full h-full glass-panel overflow-hidden relative group"
      id="molecule-viewer-container"
    >
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 flex gap-2">
        <span className="px-2 py-1 bg-sky-500/20 text-sky-400 text-xs font-mono rounded border border-sky-500/30">
          3D RENDER
        </span>
      </div>
    </div>
  );
}
