import { Pilot } from "@/Pilot";
import {
  PilotFacade,
  Config,
  TestingFrameworkAPICatalogCategory,
} from "@/types";

const pilot: PilotFacade = {
  init: (config: Config) => {
    Pilot.init(config);
  },
  isInitialized: () => {
    return Pilot.isInitialized();
  },
  start: () => {
    Pilot.getInstance().start();
  },
  end: (isCacheDisabled?: boolean) => {
    Pilot.getInstance().end(isCacheDisabled);
  },
  perform: async (...steps: string[]) => {
    const instance = Pilot.getInstance();

    let result;
    for await (const intent of steps) {
      result = await instance.performStep(intent);
    }

    return result;
  },
  autopilot: async (goal: string) => {
    return await Pilot.getInstance().autopilot(goal);
  },
  extendAPICatalog: (
    categories: TestingFrameworkAPICatalogCategory[],
    context?: any,
  ) => {
    Pilot.getInstance().extendAPICatalog(categories, context);
  },
};

export default pilot;

export {
  PilotFacade,
  Config,
  PromptHandler,
  TestingFrameworkDriver,
  TestingFrameworkAPICatalog,
  TestingFrameworkAPICatalogItem,
  TestingFrameworkDriverConfig,
} from "./types";
