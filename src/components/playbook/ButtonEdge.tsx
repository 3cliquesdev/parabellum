import { memo } from "react";
import { EdgeProps, getBezierPath, EdgeLabelRenderer, useReactFlow } from "reactflow";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ButtonEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = () => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path stroke-2 hover:stroke-[3]"
        d={edgePath}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <Button
            variant="destructive"
            size="icon"
            className="h-6 w-6 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200 group-hover:opacity-100"
            onClick={onEdgeClick}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

ButtonEdge.displayName = "ButtonEdge";
