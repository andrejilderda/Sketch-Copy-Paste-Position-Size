var Group = require('sketch/dom').Group
var Text = require('sketch/dom').Text

@import "persistence.js";

var selectionBoundT = 10000;
var selectionBoundR = 0;
var selectionBoundB = 0;
var selectionBoundL = 10000;
var copiedWidth = 0;
var copiedHeight = 0;
var copiedX = 0;
var copiedY = 0;

function onCopy(context) {
	var doc = context.document;
	var selection = context.selection;
	if (selection.count() == 1) {
		var layer = selection.objectAtIndex(0);
		var frame = layer.frame();
		// log(layer.absoluteRect().rulerX()); //relative to canvas
		// log(frame.x()); //relative to group
		copiedWidth = Math.round(frame.width());
		copiedHeight = Math.round(frame.height());
		copiedX = Math.round(layer.absoluteRect().rulerX());
		copiedY = Math.round(layer.absoluteRect().rulerY());

		rcSetSettingForKey("copiedWidth", copiedWidth)
		rcSetSettingForKey("copiedHeight", copiedHeight)
		rcSetSettingForKey("copiedX", copiedX)
		rcSetSettingForKey("copiedY", copiedY)
		doc.showMessage("Copied: Width: " + copiedWidth + " Height: " + copiedHeight + " X: " + copiedX + " Y: " + copiedY);
	} else { 
		// // The code below with .groupBoundsForLayers(selection) works, but not when having multiple objects in different groups selected.
		// // https://github.com/turbobabr/Sketch-Plugins-Cookbook#finding-bounds-for-a-set-of-layers
		// var bounds=MSLayerGroup.groupBoundsForLayers(selection);
		// rcSetSettingForKey("copiedWidth", bounds.size.width) // This doesn't work when having multiple objects selected in multiple groups
		// rcSetSettingForKey("copiedHeight", bounds.size.height)
		// rcSetSettingForKey("copiedX", bounds.origin.x)
		// rcSetSettingForKey("copiedY", bounds.origin.y)
		// doc.showMessage("Copied X: " + bounds.origin.x + " Y: " + bounds.origin.y + " Width: " + bounds.size.width + " Height: " + bounds.size.height);
		
		// // Therefore I wrote this fugly workaround which could probably be written way more efficient. For now gets the job done but feel free to refactor.
		for (var i=0; i < selection.count(); i++) {
			var layer = selection.objectAtIndex(i);
			var frame = layer.frame();

			var objBoundT = layer.absoluteRect().rulerY();
			var objBoundL = layer.absoluteRect().rulerX();
			var objBoundR = frame.width() + objBoundL;
			var objBoundB = frame.height() + objBoundT;

			if (objBoundT < selectionBoundT ) { selectionBoundT = objBoundT }
			if (objBoundR > selectionBoundR ) { selectionBoundR = objBoundR }
			if (objBoundB > selectionBoundB ) { selectionBoundB = objBoundB }
			if (objBoundL < selectionBoundL ) { selectionBoundL = objBoundL }
		}
		var selectionWidth = Math.round(selectionBoundR - selectionBoundL);
		var selectionHeight = Math.round(selectionBoundB - selectionBoundT);
		selectionBoundL = Math.round(selectionBoundL);
		selectionBoundT = Math.round(selectionBoundT);

		rcSetSettingForKey("copiedWidth", selectionWidth);
		rcSetSettingForKey("copiedHeight", selectionHeight);
		rcSetSettingForKey("copiedX", selectionBoundL);
		rcSetSettingForKey("copiedY", selectionBoundT);

		doc.showMessage("Copied: Width: " + selectionWidth + " Height: " + selectionHeight + " X: " + selectionBoundL + " Y: " + selectionBoundT);
		// log("selectionBoundT: " + selectionBoundT + "  selectionBoundR: " + selectionBoundR + "  selectionBoundB: " + selectionBoundB + "  selectionBoundL: " + selectionBoundL + "  selectionWidth: " + selectionWidth + "  selectionHeight: " + selectionHeight);
	}
	// log("values copied");
}

// A nicer/shorter way for saving settings than using persistence.js: http://developer.sketchapp.com/reference/api/file/api/Application.js.html
// It seems like they are not part of the Sketch API yet, as long as that's not
// the case I use 'rc' as a prefix to prevent conflicts in the future
function rcSetSettingForKey(key, value) {
    NSUserDefaults.standardUserDefaults().setObject_forKey_(value, key)
}
function rcSettingForKey(key) {
    return NSUserDefaults.standardUserDefaults().objectForKey_(key);
}


function pasteWHXY(context,w,h,x,y,proportional) {
	var doc = context.document;
	var selection = context.selection;
	selection.forEach( layer => {
		var frame = layer.frame();

		var newWidth = Math.round(rcSettingForKey("copiedWidth"));
		var newHeight = Math.round(rcSettingForKey("copiedHeight"));
		var newX = Math.round(rcSettingForKey("copiedX"));
		var newY = Math.round(rcSettingForKey("copiedY"));
		
    
		// unfortunately we must run this function twice to get the layer frame updated properly.
		// once before and once after the layer was resized.
		if ( proportional || w || h ) fitTextFrame( layer );
		
		// Set width / height
		if( proportional ) {
			var oldWidth = frame.width();
			var oldHeight = frame.height();

			if (w) {
				var proportion = newWidth / oldWidth;
				frame.setWidth(newWidth);
				frame.setHeight(oldHeight * proportion);
			}
			if (h) {
				var proportion = newHeight / oldHeight;
				frame.setHeight(newHeight);
				frame.setWidth(oldWidth * proportion);
			}
		}
		else {
			if (w) frame.setWidth( newWidth );
			if (h) frame.setHeight( newHeight );
		}
		
		// * cough * here we run the fitTextFrame function again
		if ( proportional || w || h ) fitTextFrame( layer );
		
		// Set position
		// if(x) {	frame.setX( rcSettingForKey("copiedX") ); } //not relative to artboard but to group
		// if(y) {	frame.setY( rcSettingForKey("copiedY") ); }
		if (x) layer.absoluteRect().setRulerX( newX );
		if (y) layer.absoluteRect().setRulerY( newY );
		// doc.showMessage(rcSettingForKey("copiedY"));
		
		doc.reloadInspector();
	})
}

// below 2 functions were partly borrowed from https://github.com/juliussohn/sketch-textbox-fit-content
// attempt to fix the textbox height after resizing. There are however issues with (text)layers with the 
// 'Fix height' property set and there doesn't seem to be a way to set this value programmatically
function fitTextFrame( layer ) {
	if ( layer instanceof MSTextLayer ) {
		// convert to wrapped API object, since some methods are only available in the Sketch API
		layer = Text.fromNative( layer );
		
		// layer.sketchObject.setFixed_forEdge_(false, 16); // disable 'Fix height' layer property
		layer.fixedWidth = true;
		
		// adjust the layer frame height based on the text lines
		var lineCount = layer.fragments.length;
		var baseHeight = layer.fragments[lineCount - 1].rect.y + layer.fragments[lineCount - 1].rect.height;
		layer.frame.height = baseHeight;
	} 
	else if ( layer instanceof MSLayerGroup ) {
		// adjust group frame to fit children
		layer.resizeToFitChildrenWithOption(0)
		
		var group = Group.fromNative(layer);
		var groupLayers = group.layers;
		groupLayers.forEach( layer => {
			fitTextFrame( layer.sketchObject );
		});
		group.adjustToFit();
	}
}

//////////////////////////////////////
function onPasteSize(context) {
	pasteWHXY(context, true, true, false, false, false); //WHXY & proportional
}

function onPasteWidth(context) {
	pasteWHXY(context, true, false, false, false, false);
}

function onPasteHeight(context) {
	pasteWHXY(context, false, true, false, false, false);
}

function onPasteSizePorportionally(context) {
	pasteWHXY(context, true, true, false, false, true);
}

function onPasteWidthPorportionally(context) {
	pasteWHXY(context, true, false, false, false, true);
}

function onPasteHeightPorportionally(context) {
	pasteWHXY(context, false, true, false, false, true);
}

function onPastePosition(context) {
	pasteWHXY(context, false, false, true, true, false);
}

function onPasteX(context) {
	pasteWHXY(context, false, false, true, false, false);
}

function onPasteY(context) {
	pasteWHXY(context, false, false, false, true, false);
}
