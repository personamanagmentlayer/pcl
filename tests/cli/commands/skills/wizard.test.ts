/**
 * Comprehensive Test Suite: PCL Skill Wizard Command
 * Tests interactive skill creation wizard
 * Target: ~25-30 tests
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import * as readline from 'readline';
import { skillWizardCommand } from '../../../../src/cli/commands/skills/wizard';

// Mock filesystem and readline
vi.mock('fs');
vi.mock('fs/promises');
vi.mock('readline');

describe('PCL Skill Wizard Command', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  let mockQuestion: any;
  let mockRlInterface: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(((
      code?: number
    ) => {
      throw new Error(`process.exit(${code})`);
    }) as any);
    vi.spyOn(process, 'cwd').mockReturnValue('/test/project');

    // Mock readline interface
    mockQuestion = vi.fn();
    mockRlInterface = {
      question: mockQuestion,
      close: vi.fn(),
    };
    vi.mocked(readline.createInterface).mockReturnValue(mockRlInterface as any);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Wizard Flow', () => {
    it('should complete full wizard with valid inputs', async () => {
      mockQuestion
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('python-expert')
        )
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('1')
        ) // language
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('Python programming expert')
        )
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('language')
        )
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('3')
        ) // advanced
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('Read,Write,Bash')
        )
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('y')
        ) // examples
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('3')
        ) // 3 examples
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('John Doe')
        ) // author
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('MIT')
        )
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('1.0.0')
        )
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('y')
        ); // confirm

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      expect(writeFile).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ Skill created successfully!')
      );
    });

    it('should display wizard header', async () => {
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        throw new Error('Cancel wizard');
      });

      await expect(skillWizardCommand()).rejects.toThrow();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('PCL Skill Generator Wizard')
      );
    });

    it('should cancel wizard when user declines', async () => {
      mockQuestion
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('test-skill')
        )
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('5')
        ) // basic
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('Test description')
        )
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('general')
        )
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('2')
        ) // intermediate
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('Read,Write')
        )
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('n')
        ) // no examples
        .mockImplementationOnce((prompt: string, callback: any) => callback('')) // skip author
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('MIT')
        )
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('1.0.0')
        )
        .mockImplementationOnce((prompt: string, callback: any) =>
          callback('n')
        ); // decline

      vi.mocked(existsSync).mockReturnValue(true);

      await skillWizardCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Cancelled')
      );
      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe('Name Validation', () => {
    it('should reject invalid name and re-prompt', async () => {
      let nameAttempts = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        if (prompt.includes('Skill name')) {
          nameAttempts++;
          if (nameAttempts === 1) {
            callback('Invalid Name!');
          } else {
            callback('valid-name');
          }
        } else {
          callback(''); // Default for other prompts
        }
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      // Mock remaining questions
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) {
          callback('Invalid Name!');
        } else if (questionCount === 2) {
          callback('valid-name');
        } else if (questionCount === 3) {
          callback('5'); // template
        } else if (questionCount === 11) {
          callback('y'); // confirm
        } else {
          callback(''); // defaults
        }
      });

      await skillWizardCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Invalid name')
      );
    });

    it('should reject name starting with uppercase', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) {
          callback('Python');
        } else if (questionCount === 2) {
          callback('python');
        } else if (questionCount === 3) {
          callback('5'); // template
        } else if (questionCount === 11) {
          callback('y'); // confirm
        } else {
          callback('');
        }
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Invalid name')
      );
    });

    it('should reject name with spaces', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) {
          callback('python expert');
        } else if (questionCount === 2) {
          callback('python-expert');
        } else if (questionCount === 3) {
          callback('5');
        } else if (questionCount === 11) {
          callback('y');
        } else {
          callback('');
        }
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Invalid name')
      );
    });
  });

  describe('Template Selection', () => {
    it('should select language template', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 2)
          callback('1'); // language
        else if (questionCount === 11) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(content).toContain('## Language Features');
    });

    it('should select framework template', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 2)
          callback('2'); // framework
        else if (questionCount === 11) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(content).toContain('## Framework Overview');
    });

    it('should select tool template', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 2)
          callback('3'); // tool
        else if (questionCount === 11) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(content).toContain('## Tool Overview');
    });

    it('should select domain template', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 2)
          callback('4'); // domain
        else if (questionCount === 11) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(content).toContain('## Domain Overview');
    });

    it('should default to basic template', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 2)
          callback(''); // default
        else if (questionCount === 11) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(content).toContain('## Core Concepts');
    });
  });

  describe('Complexity Selection', () => {
    it('should set beginner complexity', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 5)
          callback('1'); // beginner
        else if (questionCount === 11) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(content).toContain('complexity: beginner');
    });

    it('should default to intermediate complexity', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 5)
          callback(''); // default
        else if (questionCount === 11) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(content).toContain('complexity: intermediate');
    });

    it('should set expert complexity', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 5)
          callback('4'); // expert
        else if (questionCount === 11) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(content).toContain('complexity: expert');
    });
  });

  describe('Tools Configuration', () => {
    it('should parse comma-separated tools', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 6) callback('Read,Write,Edit,Bash');
        else if (questionCount === 11) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(content).toContain('- Read');
      expect(content).toContain('- Write');
      expect(content).toContain('- Edit');
      expect(content).toContain('- Bash');
    });

    it('should use default tools when empty', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 6) callback('');
        else if (questionCount === 11) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(content).toContain('- Read');
      expect(content).toContain('- Write');
    });
  });

  describe('Examples Configuration', () => {
    it('should include examples when requested', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 7)
          callback('y'); // include examples
        else if (questionCount === 8)
          callback('3'); // 3 examples
        else if (questionCount === 11) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(content).toContain('## Examples');
      expect(content).toContain('### Example 1');
      expect(content).toContain('### Example 2');
      expect(content).toContain('### Example 3');
    });

    it('should skip examples when declined', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 7)
          callback('n'); // no examples
        else if (questionCount === 10) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(content).not.toContain('## Examples');
    });

    it('should limit example count to maximum', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 7) callback('y');
        else if (questionCount === 8)
          callback('10'); // more than max
        else if (questionCount === 11) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      const exampleMatches = content.match(/### Example \d+/g);
      expect(exampleMatches?.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Metadata Configuration', () => {
    it('should include author when provided', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 9)
          callback('John Doe'); // author
        else if (questionCount === 12) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(content).toContain('author: John Doe');
    });

    it('should skip author when empty', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 9)
          callback(''); // skip author
        else if (questionCount === 12) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(content).not.toContain('author:');
    });

    it('should use custom license', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 10) callback('Apache-2.0');
        else if (questionCount === 12) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(content).toContain('license: Apache-2.0');
    });

    it('should use custom version', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('test');
        else if (questionCount === 11) callback('2.1.0');
        else if (questionCount === 12) callback('y');
        else callback('');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(content).toContain('version: 2.1.0');
    });
  });

  describe('Summary Display', () => {
    it('should display summary before confirmation', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount <= 11) callback('test');
        else callback('y');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Summary')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Name:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Template:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Description:')
      );
    });
  });

  describe('Directory Creation', () => {
    it('should create skills directory if not exists', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 12) callback('y');
        else callback('test');
      });

      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      expect(mkdir).toHaveBeenCalledWith(
        join('/test/project', '.claude', 'skills'),
        { recursive: true }
      );
    });

    it('should skip directory creation if exists', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 12) callback('y');
        else callback('test');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      expect(mkdir).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle write errors', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 12) callback('y');
        else callback('test');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(writeFile).mockRejectedValue(new Error('Write failed'));

      await expect(skillWizardCommand()).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Write failed')
      );
    });

    it('should close readline on error', async () => {
      mockQuestion.mockImplementationOnce(() => {
        throw new Error('User input error');
      });

      await expect(skillWizardCommand()).rejects.toThrow();

      expect(mockRlInterface.close).toHaveBeenCalled();
    });
  });

  describe('Success Output', () => {
    it('should display success message and next steps', async () => {
      let questionCount = 0;
      mockQuestion.mockImplementation((prompt: string, callback: any) => {
        questionCount++;
        if (questionCount === 1) callback('python-expert');
        else if (questionCount === 12) callback('y');
        else callback('test');
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillWizardCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ Skill created successfully!')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Next steps:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('1. Edit:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('2. Validate:')
      );
    });
  });
});
