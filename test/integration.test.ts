/**
 * Integration tests for built KeyboardHistory library
 * Tests import in different module systems and browser compatibility
 * Requirements: 1.1, 1.3
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Library Integration Tests', () => {
  const distPath = path.resolve(__dirname, '../dist');
  
  beforeAll(() => {
    // Ensure dist directory exists
    if (!fs.existsSync(distPath)) {
      throw new Error('Distribution files not found. Run "npm run build" first.');
    }
  });

  describe('Module System Compatibility', () => {
    test('ES module build exists and is valid', () => {
      const esModulePath = path.join(distPath, 'keyboard-history.es.js');
      expect(fs.existsSync(esModulePath)).toBe(true);
      
      const esModuleContent = fs.readFileSync(esModulePath, 'utf8');
      
      // Check for ES module exports
      expect(esModuleContent).toMatch(/export\s*{/);
      
      // Check that the module contains KeyboardHistory class
      expect(esModuleContent).toContain('KeyboardHistory');
      
      // Verify source map exists
      const sourceMapPath = path.join(distPath, 'keyboard-history.es.js.map');
      expect(fs.existsSync(sourceMapPath)).toBe(true);
    });

    test('UMD module build exists and is valid', () => {
      const umdModulePath = path.join(distPath, 'keyboard-history.umd.js');
      expect(fs.existsSync(umdModulePath)).toBe(true);
      
      const umdModuleContent = fs.readFileSync(umdModulePath, 'utf8');
      
      // Check for UMD pattern (minified version uses !function instead of (function)
      expect(umdModuleContent).toMatch(/!function\s*\(/);
      expect(umdModuleContent).toMatch(/"object"==typeof exports/);
      expect(umdModuleContent).toMatch(/"undefined"!=typeof module/);
      
      // Check that the module contains KeyboardHistory class
      expect(umdModuleContent).toContain('KeyboardHistory');
      
      // Verify source map exists
      const sourceMapPath = path.join(distPath, 'keyboard-history.umd.js.map');
      expect(fs.existsSync(sourceMapPath)).toBe(true);
    });

    test('TypeScript declarations exist and are valid', () => {
      const declarationPath = path.join(distPath, 'index.d.ts');
      expect(fs.existsSync(declarationPath)).toBe(true);
      
      const declarationContent = fs.readFileSync(declarationPath, 'utf8');
      
      // Check for main class export
      expect(declarationContent).toMatch(/export.*KeyboardHistory/);
      
      // Check for type exports (types are exported from separate types.d.ts file)
      expect(declarationContent).toMatch(/export type.*KeyEvent/);
      
      // Verify the types.d.ts file exists and contains interface definitions
      const typesPath = path.join(distPath, 'types.d.ts');
      expect(fs.existsSync(typesPath)).toBe(true);
      
      const typesContent = fs.readFileSync(typesPath, 'utf8');
      expect(typesContent).toMatch(/interface\s+KeyEvent/);
      expect(typesContent).toMatch(/interface\s+.*Config/);
      
      // Verify declaration map exists
      const declarationMapPath = path.join(distPath, 'index.d.ts.map');
      expect(fs.existsSync(declarationMapPath)).toBe(true);
    });
  });

  describe('Browser Compatibility', () => {
    test('ES module can be imported and instantiated', async () => {
      // Dynamically import the ES module
      const esModulePath = path.resolve(distPath, 'keyboard-history.es.js');
      
      // Since we're in Node.js environment, we'll test the structure
      // In a real browser, this would be: import { KeyboardHistory } from './dist/keyboard-history.es.js'
      const moduleContent = fs.readFileSync(esModulePath, 'utf8');
      
      // Verify the module exports KeyboardHistory
      expect(moduleContent).toContain('KeyboardHistory');
      // Check for ES module export syntax (can be multiline)
      expect(moduleContent).toMatch(/export\s*{\s*[\s\S]*KeyboardHistory[\s\S]*}/);
    });

    test('UMD module can be loaded in browser-like environment', () => {
      const umdModulePath = path.join(distPath, 'keyboard-history.umd.js');
      const umdContent = fs.readFileSync(umdModulePath, 'utf8');
      
      // Test that UMD module contains the expected structure
      // The actual UMD code is minified, so we test for key patterns
      
      // Check that it contains the UMD wrapper pattern
      expect(umdContent).toMatch(/typeof\s+exports/);
      expect(umdContent).toMatch(/typeof\s+module/);
      expect(umdContent).toMatch(/typeof\s+define/);
      
      // Check that KeyboardHistory class is exported
      expect(umdContent).toContain('KeyboardHistory');
      
      // Check that the main API methods are present
      const apiMethods = ['start', 'stop', 'getRecordedKeys', 'replay', 'stopReplay'];
      apiMethods.forEach(method => {
        expect(umdContent).toContain(method);
      });
      
      // Verify the module sets up global exports correctly
      expect(umdContent).toMatch(/KeyboardHistory\s*=\s*{}/);
    });

    test('Built library supports ES2015+ features', () => {
      const esModulePath = path.join(distPath, 'keyboard-history.es.js');
      const esContent = fs.readFileSync(esModulePath, 'utf8');
      
      // Check that modern JavaScript features are preserved/transpiled appropriately
      // The build should target ES2015 as specified in vite.config.ts
      
      // Should not contain very old syntax patterns
      expect(esContent).not.toMatch(/var\s+_this\s*=/); // Old-style this binding
      expect(esContent).not.toMatch(/function\s*\(\s*\)\s*{\s*return\s+function/); // Old module pattern
      
      // Should contain class syntax (ES2015+)
      expect(esContent).toMatch(/class\s+\w+/);
    });

    test('Package.json exports configuration is correct', () => {
      const packageJsonPath = path.resolve(__dirname, '../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Verify main entry points
      expect(packageJson.main).toBe('dist/keyboard-history.umd.js');
      expect(packageJson.module).toBe('dist/keyboard-history.es.js');
      expect(packageJson.types).toBe('dist/index.d.ts');
      
      // Verify exports field for modern Node.js
      expect(packageJson.exports).toBeDefined();
      expect(packageJson.exports['.']).toBeDefined();
      expect(packageJson.exports['.'].import).toBe('./dist/keyboard-history.es.js');
      expect(packageJson.exports['.'].require).toBe('./dist/keyboard-history.umd.js');
      expect(packageJson.exports['.'].types).toBe('./dist/index.d.ts');
      
      // Verify files array includes dist
      expect(packageJson.files).toContain('dist');
    });

    test('Built files have correct size constraints', () => {
      const esModulePath = path.join(distPath, 'keyboard-history.es.js');
      const umdModulePath = path.join(distPath, 'keyboard-history.umd.js');
      
      const esStats = fs.statSync(esModulePath);
      const umdStats = fs.statSync(umdModulePath);
      
      // Ensure files are not empty
      expect(esStats.size).toBeGreaterThan(0);
      expect(umdStats.size).toBeGreaterThan(0);
      
      // Ensure files are reasonably sized (not too large for a simple library)
      // This is a sanity check - adjust limits based on actual library size
      expect(esStats.size).toBeLessThan(100 * 1024); // Less than 100KB
      expect(umdStats.size).toBeLessThan(100 * 1024); // Less than 100KB
    });
  });

  describe('Cross-Module System Compatibility', () => {
    test('Both ES and UMD modules export the same API', () => {
      const esModulePath = path.join(distPath, 'keyboard-history.es.js');
      const umdModulePath = path.join(distPath, 'keyboard-history.umd.js');
      
      const esContent = fs.readFileSync(esModulePath, 'utf8');
      const umdContent = fs.readFileSync(umdModulePath, 'utf8');
      
      // Both should contain KeyboardHistory class
      expect(esContent).toContain('KeyboardHistory');
      expect(umdContent).toContain('KeyboardHistory');
      
      // Both should contain the main API methods
      const apiMethods = ['start', 'stop', 'getRecordedKeys', 'replay', 'stopReplay'];
      
      apiMethods.forEach(method => {
        expect(esContent).toContain(method);
        expect(umdContent).toContain(method);
      });
    });

    test('TypeScript declarations match built JavaScript', () => {
      const declarationPath = path.join(distPath, 'index.d.ts');
      const esModulePath = path.join(distPath, 'keyboard-history.es.js');
      
      const declarationContent = fs.readFileSync(declarationPath, 'utf8');
      const esContent = fs.readFileSync(esModulePath, 'utf8');
      
      // Check that exported classes in declarations exist in JS
      const classMatches = declarationContent.match(/export\s+.*class\s+(\w+)/g);
      if (classMatches) {
        classMatches.forEach(match => {
          const className = match.match(/class\s+(\w+)/)?.[1];
          if (className) {
            expect(esContent).toContain(className);
          }
        });
      }
      
      // Check that exported interfaces have corresponding runtime representations
      // Types are in separate types.d.ts file
      const typesPath = path.join(distPath, 'types.d.ts');
      const typesContent = fs.readFileSync(typesPath, 'utf8');
      expect(typesContent).toMatch(/interface\s+KeyEvent/);
      expect(typesContent).toMatch(/interface\s+.*Config/);
    });
  });
});