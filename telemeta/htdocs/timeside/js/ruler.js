/*
 * Copyright (C) 2007-2011 Parisson
 * Copyright (c) 2011 Riccardo Zaccarelli <riccardo.zaccarelli@gmail.com>
 * Copyright (c) 2010 Olivier Guilyardi <olivier@samalyse.com>
 *
 * This file is part of TimeSide.
 *
 * TimeSide is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * TimeSide is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TimeSide.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Authors: Riccardo Zaccarelli <riccardo.zaccarelli@gmail.com>
 *          Olivier Guilyardi <olivier@samalyse.com>
 */

/**
 * Class representing the ruler (upper part) of the player. Requires jQuery
 * and Raphael
 */
var Ruler = TimesideArray.extend({

    //init constructor: soundDuration is IN SECONDS!!! (float)
    init: function(viewer, soundDuration){
        this._super();
        var cssPref = this.cssPrefix;
        
       
        this.getSoundDuration= function(){
            return soundDuration;
        };
        
        var waveContainer = viewer.find('.' + cssPref + 'image-canvas');
        this.debug( 'WAVECONTAINER?? LENGTH='+ waveContainer.length);
        this.getWaveContainer =function(){
            return waveContainer;
        };
        //TODO: we dont need containerWiever here!!!
        //better: it is usefult only for the canvas defined below. However...
        this.getContainerWidth =function(){
            return waveContainer.width();
        };
        this.debug( 'init ruler: container width '+this.getContainerWidth());
        
        //private function used in resize() defined below
        var container = viewer.find('.' + cssPref + 'ruler');
        
        this.getRulerContainer = function(){
            return container;
        }
    },

    resize : function(){
        var duration = this.getSoundDuration(); //in seconds
        if (!duration) {
            this.debug("Can't draw ruler with a duration of 0");
            return;
        }

        
        //build a canvas with raphael:
        //setting global attributes:
        var backgroundcolor = '#333';
        var lineAttr = {
                        'stroke-width':1,
                        'stroke':'#eeeeee'
                    };
        var rulerContainer = this.getRulerContainer();
        rulerContainer.css({'backgroundColor':backgroundcolor});

        //remove all elements not pointer or marker
        rulerContainer.find(':not(a.ts-pointer,a.ts-marker,a.ts-pointer>*,a.ts-marker>*)').remove();

        //set font size (maybe this will be placed in a global or static variable)
        var h = 28; //TODO: change it (global var?)
        var obj = this.calculateRulerElements(rulerContainer.width(),h,duration);
        consolelog(obj);

        var paper = Raphael(rulerContainer[0], rulerContainer.width(), h);
        var path = paper.path(obj.path);
        path.attr(lineAttr);

        var labels = obj.labels;
        if(labels){
            var $J = this.$J;
            for(var i=0; i <labels.length;i++){
                var span = $J('<span/>').html(labels[i][0]).css({'color':'white', 'display':'block','position':'absolute','top':'0', 'left':labels[i][1]+'px'});
                rulerContainer.append(span);
            }
        }

        var pointer = undefined;
        if('getPointer' in this){
            pointer = this.getPointer();
        }
        if(!pointer){
            pointer = this.add(0);
            this.getPointer = function(){
                return pointer;
            };
        }else{
            pointer.refreshPosition();
            
        }
        this.each(function(i,rulermarker){
            rulermarker.refreshPosition();
        });

    },

    /**
     * returns an object with the following properties:
     * path: (string) the path of the ruler to be drawn
     * labels (array) an array of arrays ['text',x,y]
     */
    calculateRulerElements: function(w,h){
        var fontSize = 10;
        var duration = this.getSoundDuration();
        
        //the fontSize is actually a measure og height, seo we can set:
        var fontMargin = 2;


        var timeLabelWidth = this.textWidth('00:00', fontSize);
        var timeLabelDuration = timeLabelWidth*duration/w;

        //determine the ticks:
        var sectionDurations = [1,2,5,10,30,60,120,300,1800,3600,7200,18000,36000];
        //sectionDurations in seconds. Note that 60=1 minute, 3600=1 hour (so the maximum sectionDuration is 36000=10hours)
        var i=0;
        var len = sectionDurations.length;
        while(i<len && timeLabelDuration>sectionDurations[i]){
            i++;
        }
        var sectionDuration = sectionDurations[i];
        var sectionNums = parseInt(0.5+(duration/sectionDurations[i])); //ceil
        var sectionWidth = w*sectionDuration/duration;

        var tickCounts = [10,5,2,1];
        i=0;
        var tickCount = tickCounts[0];
        while(i<tickCounts.length-1 && tickCounts[i]*2>sectionWidth){
            i++;
        }
        var tickAtHalfSectionWidthHigher = i==0 || i==2; //draw tick at half section higher if ticks are even
        tickCount = tickCounts[i];
        var tickWidth = sectionWidth/tickCount;
        var makeTimeLabel = this.makeTimeLabel;
        var h_1 = h-1; //TODO: use line tickness instead of 1
        var path = new Array(parseInt(0.5+(w/tickWidth)));
        consolelog(path.length);
        path[0] = ['M 0 '+h_1];
        len = path.length;
        for(i=0;  i < len; i+=tickCount){
            for(var j=1; j<tickCount+1; j++){
                var k = i+j;
                var x = (k*tickWidth);
                //consolelog(k+') = '+x+' ; '+i+' * '+sectionWidth+' + '+j+' * '+tickWidth);
                //if(x<w){
                    var y = (j==tickCount ? 0 : tickAtHalfSectionWidthHigher && j==(tickCount)/2 ? .5*h : .75*h);
                    var baseline = ' L '+x+' '+h_1;
                    path[k] = baseline;
                    path[k] += ' L '+x+' '+y;
                    path[k] += baseline;
                //}
            }
        }
        var labels = new Array(sectionNums);
        for(i=0; i<sectionNums; i++){
            labels[i] = [makeTimeLabel(sectionDuration*i),fontMargin+i*sectionWidth];
        }
        return {'path': path.join('')+' z', 'labels':labels};
    },

    //overridden: Note that the pointer is NOT cleared!!!!!
    clear: function(){
        var markers = this._super();
        //        if('getPointer' in this){
        //            markers.push(this.getPointer());
        //        }
        for( var i=0; i<markers.length; i++){
            markers[i].remove();
        }
        return markers;
    },
    //overridden TimesideArray methods (add, move, remove):
    remove: function(index){
        var rulermarker = this._super(index);
        rulermarker.remove();
        this.each(index, function(i,rulermarker){
            rulermarker.setIndex(i, true);
        });
    },
    //overridden
    move: function(from, to){
        var newIndex = this._super(from,to);
        //this.debug('ruler.move: [from:'+from+', to:'+to+', real:'+newIndex+']');
        if(newIndex!=from){
            var i1 = Math.min(from,newIndex);
            var i2 = Math.max(from,newIndex)+1;
            //this.debug('updating ['+i1+','+i2+']');
            this.each(i1,i2, function(index,rulermarker){
                rulermarker.setIndex(index, true);
            });
        }
    },
    //overridden
    //markerObjOrOffset can be a marker object (see in markermap) or any object with the fields isEditable and offset
    add: function(markerObjOrOffset, indexIfMarker){
        var soundPosition;
        var isMovable;
        var markerClass;

        if(typeof markerObjOrOffset == 'number'){
            soundPosition = markerObjOrOffset;
            isMovable = true;
            markerClass='pointer';
        }else{
            soundPosition = markerObjOrOffset.offset;
            isMovable = markerObjOrOffset.isEditable;
            markerClass='marker';
        }
        
        var container = this.getRulerContainer();
        var layout = container.find("."+this.cssPrefix + 'layout');
        var $J = this.$J;
//        var pointer = new RulerMarker($J(layout.get(0)),this.getWaveContainer(),markerClass);

        
        var pointer = new RulerMarker(this.getRulerContainer(),this.getWaveContainer(),markerClass);

        

        //call super constructor
        //if it is a pointer, dont add it
        if(markerClass != 'pointer'){
            this._super(pointer,indexIfMarker); //add at the end
            //note that setText is called BEFORE move as move must have the proper label width
            this.each(indexIfMarker, function(i,rulermarker){
                rulermarker.setIndex(i,i!=indexIfMarker);
            //rulermarker.setIndex.apply(rulermarker, [i,i!=indexIfMarker]); //update label width only if it is not this marker added
            //as for this marker we update the position below (move)
            });
            this.debug('added marker at index '+indexIfMarker+' offset: '+markerObjOrOffset.offset);
        }else{
            //note that setText is called BEFORE move as move must have the proper label width
            pointer.setText(this.makeTimeLabel(0));
        }
        //proceed with events and other stuff: move (called AFTER setText or setText)
        pointer.move(this.toPixelOffset(soundPosition));
       
        //pointer.setText(markerClass== 'pointer' ? this.makeTimeLabel(0) : this.length);

        //click on labels stop propagating. Always:
        var lbl = pointer.getLabel();
        lbl.bind('click', function(evt){
            evt.stopPropagation();
            return false;
        });

        //if there are no events to associate, return it.
        if(!isMovable){
            return pointer;
        }

        //namespace for jquery event:
        var eventId = 'markerclicked';
        var doc = $J(document);
        
        var me = this;

        //flag to be set to true when moving a poiner from mouse.
        //when true, movePointer (see below) has no effect
        this.isPointerMovingFromMouse = false;
        //functions to set if we are moving the pointer (for player when playing)

        lbl.bind('mousedown.'+eventId,function(evt) {
            
            if(markerClass=='pointer'){
                me.isPointerMovingFromMouse = true;
            }

            var startX = evt.pageX; //lbl.position().left-container.position().left;
            var startPos = lbl.position().left+lbl.width()/2;
            
            evt.stopPropagation(); //dont notify the ruler or other elements;
            var newPos = startPos;
            doc.bind('mousemove.'+eventId, function(evt){
                var x = evt.pageX;
                newPos = startPos+(x-startX);
                pointer.move(newPos);
                //update the text if pointer
                if(markerClass=='pointer'){
                    pointer.setText(me.makeTimeLabel(me.toSoundPosition(newPos)));
                }
                return false;
                
            });
            //to avoid scrolling
            //TODO: what happens if the user releases the mouse OUTSIDE the browser????
            var mouseup = function(evt_){
                doc.unbind('mousemove.'+eventId);
                doc.unbind('mouseup.'+eventId);
                evt_.stopPropagation();
                if(newPos == startPos){
                    return false;
                }
                var data = {
                    'markerElement':pointer,
                    'soundPosition': me.toSoundPosition.apply(me,[newPos]),
                    'markerClass':markerClass
                };
                me.fire('markermoved',data);
                if(markerClass=='pointer'){
                    me.isPointerMovingFromMouse = false;
                }
                return false;
            };
            doc.bind('mouseup.'+eventId, mouseup);
            
            return false;
        });
        
        return pointer;


    },

    //moves the pointer, does not notify any listener.
    //soundPosition is in seconds (float)
    movePointer : function(soundPosition) {
        var pointer = this.getPointer();
        if (pointer && !this.isPointerMovingFromMouse) {
            var pixelOffset = this.toPixelOffset(soundPosition);
            //first set text, so the label width is set, then call move:
            pointer.setText(this.makeTimeLabel(soundPosition));
            pointer.move(pixelOffset); //does NOT fire any move method
        }
        //this.debug('moving pointer: position set to '+offset);
        return soundPosition;
    },

    //soundPosition is in seconds (float)
    toPixelOffset: function(soundPosition) {
        //this.debug('sPos:' + soundPosition+ 'sDur: '+this.getSoundDuration());
        var duration = this.getSoundDuration();
        if (soundPosition < 0){
            soundPosition = 0;
        }else if (soundPosition > duration){
            soundPosition = duration;
        }
        var width = this.getContainerWidth();
        var pixelOffset = (soundPosition / duration) * width;
        return pixelOffset;
    },

    //returns the soundPosition is in seconds (float)
    toSoundPosition: function(pixelOffset) {
        var width = this.getContainerWidth();

        if (pixelOffset < 0){
            pixelOffset = 0;
        }else if (pixelOffset > width){
            pixelOffset = width;
        }
        var duration = this.getSoundDuration();
        var soundPosition = (pixelOffset / width) *duration;
        return soundPosition;
    }
});