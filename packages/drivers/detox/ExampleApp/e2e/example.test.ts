import pilot from '@wix-pilot/core';
import {DetoxFrameworkDriver} from '../../index.ts';
import {PromptHandler} from '../../utils/promptHandler.ts';
import {device} from 'detox';

describe('ExampleApp Detox Test Suite', () => {
    jest.setTimeout(300000);

    let frameworkDriver: DetoxFrameworkDriver;

    beforeAll(async () => {
        const promptHandler: PromptHandler = new PromptHandler();

        frameworkDriver = new DetoxFrameworkDriver();

        pilot.init({
            frameworkDriver,
            promptHandler,
        });

        await device.launchApp();
    });

    beforeEach(async () => {
        pilot.start();

        await device.reloadReactNative();
    });

    afterEach(async () => {
        pilot.end();
    });

    describe('Emoji Game', () => {
        it('should get 10 point in the matching game', async () => {
            await pilot.autopilot(`Drag emojis in the Emoji game, until you reach score 3. The transparent circles are the targets.`
            );
        });
    });

    describe('Colors Game', () => {
        it('should verify the color matching game', async () => {
            await pilot.autopilot(`Play the color matching game by identifying words whose text color matches their meaning. Continue playing until you correctly match 3 colors.
            Notice that for every correct match, a success window will appear, and you will need to actively close it.`
            );
        });
    });

    describe('Assertions screen', () => {
        it('should test the screen', async () => {
            await pilot.autopilot(`Explore the assertions screen and verify the different assertions.`
            );
        });
    });
});
