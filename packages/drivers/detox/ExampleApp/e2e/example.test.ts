import { Pilot } from '@wix-pilot/core';
import { DetoxFrameworkDriver } from '../../index.ts';
import { WixPromptHandler } from "@wix-pilot/prompt-handler";
import { device } from 'detox';
import { AUTOPILOT_REVIEW_DEFAULTS } from "../../../../core/src/performers/auto-performer/reviews/reviewDefaults.ts";

describe('ExampleApp Detox Test Suite', () => {
    jest.setTimeout(300000);

    let frameworkDriver: DetoxFrameworkDriver;
    let pilot: Pilot;

    const reviewTypes = [{
        title: "Layout Integrity",
        emoji: "🏗️",
        description: "The Layout Integrity Review focuses on the overall layout and structure of the product. This review assesses the alignment, spacing, and visual hierarchy of the UI components.",
        guidelines: [
            "Check for consistent spacing between elements and sections.",
            "Verify that the alignment of elements follows a grid or layout system.",
            "Assess the visual hierarchy to ensure important elements stand out.",
            "Look for any overlapping or misaligned elements that disrupt the layout integrity."]
    }]

    beforeAll(async () => {
        const promptHandler: WixPromptHandler = new WixPromptHandler();
        frameworkDriver = new DetoxFrameworkDriver();

        pilot = new Pilot({
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
            await pilot.autopilot(`Drag emojis in the Emoji game, until you reach score 2. The transparent circles are the targets.`, reviewTypes);
        });
    });

    describe('Colors Game', () => {
        it('should verify the color matching game', async () => {
            await pilot.autopilot(`Play the color matching game by identifying words whose text color matches their meaning. Continue playing until you correctly match 3 colors.
            Notice that for every correct match, a success window will appear, and you will need to actively close it.`);
        });
    });

    describe('Assertions screen', () => {
        it.only('should test the screen', async () => {
            await pilot.autopilot(`Explore the assertions screen and verify the different assertions.`);
        });
    });

    describe('pilot check', () => {
       it('should check the pilot', async () => {
           await pilot.perform('drag the star emoji to the transparent star emoji',
               'verify the score is 1');
       });
       it('should check the autopilot', async () => {
              await pilot.autopilot('get 1 point in the emoji game using the star emoji');
       });
       it('should check the pilot', async () => {
          await pilot.perform('go to the assertions screen', 'change toggle value to 1');
       });

       it('should check the autopilot', async () => {
          await pilot.autopilot('go to the assertions screen', AUTOPILOT_REVIEW_DEFAULTS);
       });
    });
});
