import "./styles/StackLayer.css";

// Wrap any component in this to make it slide up over the layer before it.
export default function StackLayer({ layerRef, className = "", children }) {
  return (
    <div ref={layerRef} className={`stack-layer ${className}`}>
      {children}
    </div>
  );
}