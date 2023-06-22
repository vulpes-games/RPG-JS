import * as plugin from '../src/build/vite-plugin-config.toml'
import Vi, { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import * as path from 'path'
import mockFs from 'mock-fs'
import sizeOf from 'image-size'

const { formatVariableName, getAllFiles, importString, transformPathIfModule, searchFolderAndTransformToImportString, loadSpriteSheet, loadClientFiles, createModuleLoad } = plugin

vi.mock('image-size')

describe('TOML Configuration test', () => {
    test('should return path with "node_modules/" when module starts with "@rpgjs" or "rpgjs"', () => {
        const moduleName1 = '@rpgjs/some_module';
        const moduleName2 = 'rpgjs/some_module';

        const result1 = transformPathIfModule(moduleName1);
        const result2 = transformPathIfModule(moduleName2);

        expect(result1).toBe(`node_modules/${moduleName1}`);
        expect(result2).toBe(`node_modules/${moduleName2}`);
    });

    test('should return original module name when it does not start with "@rpgjs" or "rpgjs"', () => {
        const moduleName = 'some_other_module/some_module';

        const result = transformPathIfModule(moduleName);

        expect(result).toBe(moduleName);
    });

    test('should replace special characters with underscore', () => {
        const packageName = 'test.package.name-with@special/characters';

        const result = formatVariableName(packageName);

        expect(result).toBe('testpackagename_with_special_characters');
    });

    test('should return all files in a directory recursively', () => {
        const directoryPath = 'test_directory';

        mockFs({
            [directoryPath]: {
                'file1': '',
                'dir1': {
                    'file2': ''
                }
            }
        })

        const result = getAllFiles(directoryPath);

        expect(result).toEqual([
            path.join(directoryPath, 'dir1', 'file2'),
            path.join(directoryPath, 'file1'),
        ]);
    });

    describe('importString', () => {
        test('should return the import string if the file exists', () => {
            const modulePath = 'some_module';
            const fileName = 'file1';

            mockFs({
                [modulePath]: {
                    [fileName + '.ts']: ''
                }
            })

            const result = importString(modulePath, fileName);

            expect(result).toBe(`import ${fileName} from '${modulePath}/${fileName}.ts'`);
        });

        test('should return an empty string if the file does not exist', () => {
            const modulePath = 'some_module';
            const fileName = 'file1';

            mockFs({})

            const result = importString(modulePath, fileName);

            expect(result).toBe('');
        });
    });

    describe('searchFolderAndTransformToImportString', () => {
        test('should return an import string for each file in the directory', () => {
            const folderPath = 'test_folder'
            const modulePath = 'main'
            const extensionFilter = '.ts'

            mockFs({
                [modulePath + '/' + folderPath]: {
                    'file1.ts': '',
                    'file2.ts': ''
                }
            })

            const result = searchFolderAndTransformToImportString(
                folderPath,
                modulePath,
                extensionFilter
            )

            expect(result.variablesString).toBe('_main_test_folder_file1ts,_main_test_folder_file2ts')
            expect(result.importString).toContain(`import _main_test_folder_file1ts from './main/test_folder/file1.ts'`)
            expect(result.importString).toContain(`import _main_test_folder_file2ts from './main/test_folder/file2.ts'`)
            expect(result.folder).toContain('main/test_folder')
        })

        test('should use returnCb to format variables if provided', () => {
            const folderPath = 'test_folder'
            const modulePath = 'main'
            const extensionFilter = '.ts'
            const returnCb = (file: string, variableName: string) => `${file} as ${variableName}`

            mockFs({
                [modulePath + '/' + folderPath]: {
                    'file1.ts': '',
                    'file2.ts': ''
                }
            })

            const result = searchFolderAndTransformToImportString(
                folderPath,
                modulePath,
                extensionFilter,
                returnCb
            )

            expect(result.variablesString).toBe('./main/test_folder/file1.ts as _main_test_folder_file1ts,./main/test_folder/file2.ts as _main_test_folder_file2ts')
            expect(result.importString).toContain(`import _main_test_folder_file1ts from './main/test_folder/file1.ts'`)
            expect(result.importString).toContain(`import _main_test_folder_file2ts from './main/test_folder/file2.ts'`)
            expect(result.folder).toContain('main/test_folder')
        })

        test('should find and return import strings for files in nested directories', () => {
            const folderPath = 'test_folder'
            const modulePath = 'main'
            const extensionFilter = '.ts'

            mockFs({
                [modulePath + '/' + folderPath + '/deep']: {
                    'file1.ts': '',
                    'file2.ts': ''
                }
            })

            const result = searchFolderAndTransformToImportString(
                folderPath,
                modulePath,
                extensionFilter
            )

            expect(result.variablesString).toBe('_main_test_folder_deep_file1ts,_main_test_folder_deep_file2ts')
            expect(result.importString).toContain(`import _main_test_folder_deep_file1ts from './main/test_folder/deep/file1.ts'`)
            expect(result.importString).toContain(`import _main_test_folder_deep_file2ts from './main/test_folder/deep/file2.ts'`)
            expect(result.folder).toContain('main/test_folder')
        })

        test('should find and return import strings for files with multiple extensions', () => {
            const folderPath = 'test_folder'
            const modulePath = 'main'
            const extensionFilter = ['.ts', '.json', '.tmx']

            mockFs({
                [modulePath + '/' + folderPath]: {
                    'file1.ts': '',
                    'file2.json': '',
                    'file3.tmx': '',
                    'file4.js': ''
                }
            })

            const result = searchFolderAndTransformToImportString(
                folderPath,
                modulePath,
                extensionFilter
            )

            expect(result.variablesString).toBe('_main_test_folder_file1ts,_main_test_folder_file2json,_main_test_folder_file3tmx')
            expect(result.importString).toContain(`import _main_test_folder_file1ts from './main/test_folder/file1.ts'`)
            expect(result.importString).toContain(`import _main_test_folder_file2json from './main/test_folder/file2.json'`)
            expect(result.importString).toContain(`import _main_test_folder_file3tmx from './main/test_folder/file3.tmx'`)
            expect(result.folder).toContain('main/test_folder')
        })

        test('should return empty strings and folder if the folder does not exist', () => {
            const folderPath = 'test_folder'
            const modulePath = 'test_module'
            const extensionFilter = '.ts';

            mockFs({})

            const result = searchFolderAndTransformToImportString(
                folderPath,
                modulePath,
                extensionFilter
            )

            expect(result).toEqual({
                variablesString: '',
                importString: '',
                folder: '',
            })
        })
    })

    describe('loadSpriteSheet', () => {
        test('should return import strings for sprite sheet', () => {
            const directoryName = 'sprite_folder'
            const modulePath = 'main'
            const options = { serveMode: true, type: 'rpg' }

            mockFs({
                [modulePath + '/' + directoryName]: {
                    'sprite1.ts': '',
                    'sprite1.png': ''
                }
            });

            // Mock sizeOf to return specific dimensions
            (sizeOf as Vi.Mock).mockReturnValue({ width: 100, height: 100 })

            const result = loadSpriteSheet(directoryName, modulePath, options)

            expect(result.variablesString).toBe('_main_sprite_folder_sprite1ts')
            expect(result.importString).toContain(`import _main_sprite_folder_sprite1ts from './main/sprite_folder/sprite1.ts'`)
            expect(result.propImagesString).toContain(`"sprite1": "main/sprite_folder/sprite1.png"`)
            expect(result.propImagesString).toContain(`_main_sprite_folder_sprite1ts.prototype.width = 100`)
            expect(result.propImagesString).toContain(`_main_sprite_folder_sprite1ts.prototype.height = 100`)
            expect(result.folder).toContain('main/sprite_folder')
        })
    })

    describe('loadClientFiles', () => {
        test('should return a module string with the correct imports', () => {
            const modulePath = 'main'
            const options = { serveMode: true, type: 'rpg' }
            const config = { spritesheetDirectories: ['characters'] }

            mockFs({
                [modulePath]: {
                    characters: {
                        'sprite1.ts': '',
                        'sprite1.png': ''
                    },
                    'engine.ts': '',
                    'sprite.ts': '',
                    'scene-map.ts': '',
                    'client.ts': ''
                }
            })

            const result = loadClientFiles(modulePath, options, config)

            // checking for import statements
            expect(result).toContain(`import { RpgClient, RpgModule } from '@rpgjs/client'`)
            expect(result).toContain(`import sprite from '${modulePath}/sprite.ts'`)
            expect(result).toContain(`import sceneMap from '${modulePath}/scene-map.ts'`)
            expect(result).toContain(`import engine from '${modulePath}/client.ts'`)
            expect(result).toContain(`import _${modulePath}_characters_sprite1ts from './${modulePath}/characters/sprite1.ts'`)

            // checking for module declaration
            expect(result).toContain(`@RpgModule<RpgClient>({`)
            expect(result).toContain(`spritesheets: [ _${modulePath}_characters_sprite1ts ],`)
            expect(result).toContain(`sprite: sprite,`)
            expect(result).toContain(`engine,`)
            expect(result).toContain(`scenes: { map: sceneMap },`)
            expect(result).toContain(`export default class RpgClientModuleEngine {}`)
        })
    })

    describe('createModuleLoad', () => {
        beforeEach(() => {
            //vi.mock('../src/build/vite-plugin-config.toml')
        })

        // TODO
        test('should return server files if id ends with serverFile', () => {
            const id = 'virtual-module-server.ts?server'
            const variableName = 'module'
            const modulePath = 'main'
            const options = { serveMode: true, type: 'rpg' }
            const spy = vi.spyOn(plugin, 'loadServerFiles')
            createModuleLoad(id, variableName, modulePath, options, {})
            //expect(spy).toHaveBeenCalled()
            spy.mockReset()
            spy.mockRestore()
        })
    })

    afterEach(() => {
        mockFs.restore();
    })
});