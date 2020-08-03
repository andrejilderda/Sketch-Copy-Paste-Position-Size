const Group = require('sketch/dom').Group;
const Text = require('sketch/dom').Text;
const document = require('sketch/dom').getSelectedDocument();
const Settings = require('sketch/settings');
const UI = require('sketch/ui');

const pixelFit = (input) => {
  return Settings.globalSettingForKey("tryToFitToPixelBounds") ? Math.round(input) : input;
}

export function onCopy() {
	const selection = document.selectedLayers;
	if (!selection.length) return UI.message('Please select at least one layer to copy from.');

	if (selection.length === 1) {
		const layer = selection.layers[0];
		const frame = layer.frame;

		const copiedWidth = pixelFit(frame.width);
		const copiedHeight = pixelFit(frame.height);
		const copiedX = pixelFit(frame.x);
		const copiedY = pixelFit(frame.y);

		Settings.setSettingForKey("copiedWidth", copiedWidth);
		Settings.setSettingForKey("copiedHeight", copiedHeight);
		Settings.setSettingForKey("copiedX", copiedX);
    Settings.setSettingForKey("copiedY", copiedY);

    UI.message(`📋 Width: ${pixelFit(copiedWidth)} Height: ${pixelFit(copiedHeight)} X: ${pixelFit(copiedX)} Y: ${pixelFit(copiedY)}`);
	} else {
		const { layers } = selection;

		const selectionBoundL = Math.min(...layers.map(layer => layer.frame.x));
		const selectionBoundT = Math.min(...layers.map(layer => layer.frame.y));
		const selectionBoundR = Math.max(...layers.map(layer => layer.frame.x + layer.frame.width));
		const selectionBoundB = Math.max(...layers.map(layer => layer.frame.y + layer.frame.height));
		const selectionWidth = pixelFit(selectionBoundR - selectionBoundL);
		const selectionHeight = pixelFit(selectionBoundB - selectionBoundT);

		Settings.setSettingForKey("copiedWidth", selectionWidth);
		Settings.setSettingForKey("copiedHeight", selectionHeight);
		Settings.setSettingForKey("copiedX", pixelFit(selectionBoundL));
		Settings.setSettingForKey("copiedY", pixelFit(selectionBoundT));

		UI.message(`📋 Width: ${pixelFit(selectionWidth)} Height: ${pixelFit(selectionHeight)} X: ${pixelFit(selectionBoundL)} Y: ${pixelFit(selectionBoundT)}`);
	}
}

export function pasteWHXY(w,h,x,y,proportional) {
	const { selectedLayers } = document;

	selectedLayers.forEach( layer => {
		const { frame } = layer;

		const newWidth = pixelFit(Settings.settingForKey('copiedWidth'));
		const newHeight = pixelFit(Settings.settingForKey('copiedHeight'));
		const newX = pixelFit(Settings.settingForKey('copiedX'));
		const newY = pixelFit(Settings.settingForKey('copiedY'));

		// we must run this function twice to get the layer frame updated properly.
		// once before and once after the layer was resized.
		if ( proportional || w || h ) fitTextFrame( layer );

		// Set width / height
		if( proportional ) {
			const oldWidth = frame.width;
			const oldHeight = frame.height;

			if (w) {
				const proportion = newWidth / oldWidth;
				frame.width = newWidth;
				frame.height = oldHeight * proportion;
			}
			if (h) {
				const proportion = newHeight / oldHeight;
				frame.height = newHeight;
				frame.width = oldWidth * proportion;
			}
		}
		else {
			if (w) frame.width = newWidth;
			if (h) frame.height = newHeight;
		}

		// run the fitTextFrame function again
		if ( proportional || w || h ) fitTextFrame( layer );

		// Set position
		if (x) frame.x = newX;
		if (y) frame.y = newY;
	})
}

// below 2 functions were partly borrowed from https://github.com/juliussohn/sketch-textbox-fit-content
// attempt to fix the textbox height after resizing. There are however issues with (text)layers with the
// 'Fix height' property set and there doesn't seem to be a way to set this value programmatically
function fitTextFrame( layer ) {
	if ( layer instanceof MSTextLayer ) {
		// convert to wrapped API object, since some methods are only available in the Sketch API
		layer = Text.fromNative( layer );
		layer.fixedWidth = true;

		// adjust the layer frame height based on the text lines
		const lineCount = layer.fragments.length;
		const baseHeight = layer.fragments[lineCount - 1].rect.y + layer.fragments[lineCount - 1].rect.height;
		layer.frame.height = baseHeight;
	}
	else if ( layer instanceof MSLayerGroup ) {
		// adjust group frame to fit children
		layer.resizeToFitChildrenWithOption(0)

		const group = Group.fromNative(layer);
		const groupLayers = group.layers;
		for (let layer of groupLayers) {
			fitTextFrame( layer.sketchObject );
		};
		group.adjustToFit();
	}
}

export function onPasteSize() {
	pasteWHXY(true, true, false, false, false); //WHXY & proportional
}

export function onPasteWidth() {
	pasteWHXY(true, false, false, false, false);
}

export function onPasteHeight() {
	pasteWHXY(false, true, false, false, false);
}

export function onPasteSizePorportionally() {
	pasteWHXY(true, true, false, false, true);
}

export function onPasteWidthPorportionally() {
	pasteWHXY(true, false, false, false, true);
}

export function onPasteHeightPorportionally() {
	pasteWHXY(false, true, false, false, true);
}

export function onPastePosition() {
	pasteWHXY(false, false, true, true, false);
}

export function onPasteX() {
	pasteWHXY(false, false, true, false, false);
}

export function onPasteY() {
	pasteWHXY(false, false, false, true, false);
}
