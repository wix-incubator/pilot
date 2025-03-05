import fs from 'fs';
import path from 'path';
import { ensureDirectoryExists, readJsonFile, writeJsonFile } from './fileSystem';
import logger from '@/common/logger';

jest.mock('fs');
jest.mock('@/common/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('fileSystem utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('ensureDirectoryExists', () => {
    it('should create directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      ensureDirectoryExists('/path/to/dir');
      
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/dir');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/path/to/dir', { recursive: true });
    });
    
    it('should not create directory if it already exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      ensureDirectoryExists('/path/to/dir');
      
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/dir');
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });
  
  describe('readJsonFile', () => {
    it('should read and parse JSON file when it exists', () => {
      const mockData = { key: 'value' };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockData));
      
      const result = readJsonFile('/path/to/file.json');
      
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file.json');
      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/file.json', 'utf-8');
      expect(result).toEqual(mockData);
    });
    
    it('should return undefined when file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const result = readJsonFile('/path/to/nonexistent.json');
      
      expect(result).toBeUndefined();
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });
    
    it('should handle and log errors when reading fails', () => {
      const error = new Error('Read error');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw error;
      });
      
      const result = readJsonFile('/path/to/file.json');
      
      expect(result).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error reading file /path/to/file.json: Read error')
      );
    });
    
    it('should handle and log errors when parsing fails', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');
      
      const result = readJsonFile('/path/to/file.json');
      
      expect(result).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error reading file /path/to/file.json:')
      );
    });
  });
  
  describe('writeJsonFile', () => {
    it('should write data to file and return true on success', () => {
      const mockData = { key: 'value' };
      
      const result = writeJsonFile('/path/to/file.json', mockData);
      
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/path/to/file.json',
        JSON.stringify(mockData, null, 2),
        { flag: 'w+' }
      );
    });
    
    it('should ensure directory exists before writing', () => {
      jest.spyOn(path, 'dirname').mockReturnValue('/path/to');
      
      writeJsonFile('/path/to/file.json', {});
      
      // Check if directory was checked/created
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to');
    });
    
    it('should handle errors and return false when writing fails', () => {
      const error = new Error('Write error');
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw error;
      });
      
      const result = writeJsonFile('/path/to/file.json', {});
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error writing file /path/to/file.json: Write error')
      );
    });
  });
});
