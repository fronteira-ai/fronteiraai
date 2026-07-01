import type { PipelineContext } from "../../types/pipeline.types";

export interface ISyncStage {
  readonly name: string;
  execute(ctx: PipelineContext): Promise<PipelineContext>;
}
