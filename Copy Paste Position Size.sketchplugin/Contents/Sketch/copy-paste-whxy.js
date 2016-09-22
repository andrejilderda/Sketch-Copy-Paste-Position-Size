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

		persist.set("copiedWidth", copiedWidth)
		persist.set("copiedHeight", copiedHeight)
		persist.set("copiedX", copiedX)
		persist.set("copiedY", copiedY)
		doc.showMessage("Copied: Width: " + copiedWidth + " Height: " + copiedHeight + " X: " + copiedX + " Y: " + copiedY);
	} else { 
		// // The code below with .groupBoundsForLayers(selection) works, but not when having multiple objects in different groups selected.
		// // https://github.com/turbobabr/Sketch-Plugins-Cookbook#finding-bounds-for-a-set-of-layers
		// var bounds=MSLayerGroup.groupBoundsForLayers(selection);
		// persist.set("copiedWidth", bounds.size.width) // This doesn't work when having multiple objects selected in multiple groups
		// persist.set("copiedHeight", bounds.size.height)
		// persist.set("copiedX", bounds.origin.x)
		// persist.set("copiedY", bounds.origin.y)
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

		persist.set("copiedWidth", selectionWidth);
		persist.set("copiedHeight", selectionHeight);
		persist.set("copiedX", selectionBoundL);
		persist.set("copiedY", selectionBoundT);

		doc.showMessage("Copied: Width: " + selectionWidth + " Height: " + selectionHeight + " X: " + selectionBoundL + " Y: " + selectionBoundT);
		// log("selectionBoundT: " + selectionBoundT + "  selectionBoundR: " + selectionBoundR + "  selectionBoundB: " + selectionBoundB + "  selectionBoundL: " + selectionBoundL + "  selectionWidth: " + selectionWidth + "  selectionHeight: " + selectionHeight);
	}
	// log("values copied");
}

function pasteWHXY(context,w,h,x,y,proportional) {
	var doc = context.document;
	var selection = context.selection;
	for (var i=0; i < selection.count(); i++) {
		var layer = selection.objectAtIndex(i);
		var frame = layer.frame();

		var newWidth = Math.round(persist.get("copiedWidth"));
		var newHeight = Math.round(persist.get("copiedHeight"));
		var newX = Math.round(persist.get("copiedX"));
		var newY = Math.round(persist.get("copiedY"));
		
		if(proportional) {
			var oldWidth = frame.width();
			var oldHeight = frame.height();

			if(w) {
				var proportion = newWidth / oldWidth;
				frame.setWidth(newWidth);
				frame.setHeight(oldHeight * proportion);
			}
			if(h) {
				var proportion = newHeight / oldHeight;
				frame.setHeight(newHeight);
				frame.setWidth(oldWidth * proportion);
			}
		}
		else {
			if(w) {	frame.setWidth( newWidth ); }
			if(h) {	frame.setHeight( newHeight ); }
		}
		// if(x) {	frame.setX( persist.get("copiedX") ); } //not relative to artboard but to group
		// if(y) {	frame.setY( persist.get("copiedY") ); }
		if(x) {	layer.absoluteRect().setRulerX( newX ); }
		if(y) {	layer.absoluteRect().setRulerY( newY ); }
		// doc.showMessage(persist.get("copiedY"));
		doc.reloadInspector();
	}
}

function get(value) {

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