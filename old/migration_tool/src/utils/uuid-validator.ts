import { v4 as uuidv4, validate as uuidValidate } from '../../$node_modules/uuid/dist/esm/index.js';
import { logger } from './logger.js';

/**
 * UUID validation and generation utilities
 */
export class UuidValidator {
  /**
   * Generate a valid UUID v4
   */
  static generate(): string {
    const uuid = uuidv4();
    logger.debug(`Generated UUID: ${uuid}`);
    return uuid;
  }

  /**
   * Validate if a string is a valid UUID
   */
  static isValid(uuid: string): boolean {
    const isValid = uuidValidate(uuid);
    if (!isValid) {
      logger.warn(`Invalid UUID format: "${uuid}"`);
    }
    return isValid;
  }

  /**
   * Convert a legacy ID to a valid UUID
   * If generateUUID is true, generates a new UUID
   * If generateUUID is false, attempts to format the legacy ID as UUID or generates one if invalid
   */
  static convertLegacyId(legacyId: string | number, generateUUID: boolean): string {
    const legacyIdStr = legacyId.toString();
    
    if (generateUUID) {
      const newUuid = this.generate();
      logger.debug(`Converting legacy ID "${legacyIdStr}" to new UUID: ${newUuid}`);
      return newUuid;
    }

    // Check if legacy ID is already a valid UUID
    if (this.isValid(legacyIdStr)) {
      logger.debug(`Legacy ID "${legacyIdStr}" is already a valid UUID`);
      return legacyIdStr;
    }

    // Legacy ID is not a valid UUID, generate a new one
    const newUuid = this.generate();
    logger.warn(`Legacy ID "${legacyIdStr}" is not a valid UUID, generating new UUID: ${newUuid}`);
    return newUuid;
  }

  /**
   * Validate and log UUID generation for debugging
   */
  static validateAndLog(uuid: string, context: string): string {
    if (!this.isValid(uuid)) {
      logger.error(`Invalid UUID generated in ${context}: "${uuid}"`);
      const fallbackUuid = this.generate();
      logger.info(`Generated fallback UUID for ${context}: ${fallbackUuid}`);
      return fallbackUuid;
    }
    
    logger.debug(`Valid UUID confirmed for ${context}: ${uuid}`);
    return uuid;
  }

  /**
   * Test UUID generation and validation
   */
  static runDiagnostics(): void {
    logger.info('🧪 Running UUID diagnostics...');
    
    // Test 1: Generate valid UUIDs
    const testUuids = Array.from({ length: 5 }, () => this.generate());
    logger.info(`Generated test UUIDs: ${testUuids.join(', ')}`);
    
    // Test 2: Validate generated UUIDs
    const validationResults = testUuids.map(uuid => ({
      uuid,
      isValid: this.isValid(uuid)
    }));
    
    const allValid = validationResults.every(result => result.isValid);
    logger.info(`All generated UUIDs valid: ${allValid}`);
    
    // Test 3: Test legacy ID conversion
    const legacyIds = ['123', '456', 'user-789', 'invalid-uuid-format'];
    logger.info('Testing legacy ID conversion:');
    
    legacyIds.forEach(legacyId => {
      const convertedWithGenerate = this.convertLegacyId(legacyId, true);
      const convertedWithoutGenerate = this.convertLegacyId(legacyId, false);
      
      logger.info(`  Legacy ID "${legacyId}":
        With generateUUID=true: ${convertedWithGenerate}
        With generateUUID=false: ${convertedWithoutGenerate}`);
    });
    
    logger.info('✅ UUID diagnostics completed');
  }
}