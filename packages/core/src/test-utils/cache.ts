import fs from "fs";
import * as fileSystem from "../common/cacheHandler/fileSystem";

export let mockedCacheFile: { [key: string]: any } | undefined;

export const mockCache = (
  data: { [key: string]: any } | undefined = undefined,
) => {
  mockedCacheFile = data;

  // Mock fs methods
  (fs.writeFileSync as jest.Mock).mockImplementation((filePath, data) => {
    mockedCacheFile = JSON.parse(data);
  });

  (fs.readFileSync as jest.Mock).mockReturnValue(
    JSON.stringify(mockedCacheFile),
  );

  (fs.existsSync as jest.Mock).mockReturnValue(mockedCacheFile !== undefined);
  
  // Mock fileSystem module methods
  jest.spyOn(fileSystem, 'writeJsonFile').mockImplementation((filePath, data) => {
    mockedCacheFile = data as { [key: string]: any };
    return true;
  });
  
  jest.spyOn(fileSystem, 'readJsonFile').mockImplementation(() => {
    return mockedCacheFile;
  });
  
  jest.spyOn(fileSystem, 'ensureDirectoryExists').mockImplementation(() => {
    // Do nothing
  });
};
