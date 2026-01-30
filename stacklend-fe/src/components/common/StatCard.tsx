import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const StatCard = ({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint?: string;
}) => {
  return (
    <div className="card-brut p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-muted-foreground">{title}</h3>
        {hint ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span aria-label="info" className="cursor-help select-none">ⓘ</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">{hint}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
      <div className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">{value}</div>
    </div>
  );
};
