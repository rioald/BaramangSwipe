/*!
 * BaramangSwipe jQuery Plugin v1.0
 * http://lab.zzune.com
 * https://github.com/rioald/BaramangSwipe
 *
 * Baramang(Banana, Lime, Mango) is originate by jjaom
 * special thanks to gramakson, hyo
 *
 * Copyright (c) 2011 zune-seok Moon (zune rioald).
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * 
 * Depends on TouchSwipe (jquery.touchSwipe v1.2.5)
 * Matt Bryson (www.skinkers.com)
 * http://plugins.jquery.com/project/touchSwipe
 * http://labs.skinkers.com/touchSwipe/
 * https://github.com/mattbryson/TouchSwipe-Jquery-Plugin
 *
 * Date: Wed Dec 28 11:38:36 2011 +0900
 */
var BaramangSwipe = {
	template: {},
	action: {}
};

(function($) {

BaramangSwipe.model = function(obj, elements, options) {
	var self = this;
	
	this.obj = obj;
	this.elementsSelector = elements;
	this.elements = this.obj.find(this.elementsSelector);
	this.lock = false;
	this.containerX = 0;
	
	// 세팅한 그룹 내 element의 계산 후 실제 값들
	this.elementWidth = options.elementWidth || this.elements.eq(0).width();
	this.elementCount = this.elements.length;
	this.elementCountPerGroup = options.elementCountPerGroup || 999;
	this.maxElementGroup = options.elementCountPerGroup ? Math.ceil(this.elementCount / options.elementCountPerGroup) : this.elementCount;
	this.currentPositionGroup = options.currentPositionGroup || 0;
	this.currentPageNo = 0;
	
	// private var
	var isLoop = options.isLoop || false;
	var isAutoScroll = false;
	var autoScrollInterval = null;
	
	this.options = {
		elementWidth: options.elementWidth || this.elements.eq(0).width(),
		elementCountPerGroup: options.elementCountPerGroup || 999,
		speed: options.speed || 500,
		isLoop: options.isLoop || false,
		isAutoScroll: options.isAutoScroll || false,
		autoScrollDirection: options.autoScrollDirection == "left" ? "left" : "right",
		autoScrollTime: options.autoScrollTime || 9000
	};
	
	this.swipeOptions = $.extend({
		triggerOnTouchEnd : true,	
		swipeStatus : function(event, phase, direction, distance) { 
						self.swipeStatus(event, phase, direction, distance); 
					  },
		allowPageScroll: "vertical",
		threshold: (navigator.userAgent.search("Android") > -1) ? 15 : 75,
		click: function(e, v) {
			var a = $(v).parents("a");
			
			if(a.length > 0) {
				var isDefaultAnchor = a.get(0).onclick ? a.get(0).onclick() : true;
				
				if(isDefaultAnchor) {
					window.location.href = a.eq(0).attr("href");
				}
			}
		}
	}, options.swipeOptions);
	
	this._initDimension = function() {
		// 상위 컨테이너의 width가 element의 최대크기
		var maxElementWidth = self.obj.parent().width();
		
		// element의 부모 (늘어날 부분)
		self.elementWidth = Math.min(self.options.elementWidth, maxElementWidth);
		self.obj.width(self.elementWidth * self.elementCount);
		
		// 컨테이너의 최대 크기보다 내부의 element의 width가 더 클 수 없음
		var possibleElementCountPerGroup = Math.floor(maxElementWidth / self.elementWidth);
		
		if(self.options.elementCountPerGroup > possibleElementCountPerGroup) {
			self.elementCountPerGroup = possibleElementCountPerGroup;
		} else {
			self.elementCountPerGroup = self.options.elementCountPerGroup;
		}
		
		// 최대 element group갯수를 구함
		self.maxElementGroup = Math.ceil(self.elementCount / self.elementCountPerGroup);
		
		// element의 크기를 재설정함
		// element group갯수가 1개뿐인 경우에는 지정된 elementWidth를 무시하고 크기에 맞게 넓힌다
		self.elementWidth = Math.ceil(maxElementWidth / Math.min(self.elementCountPerGroup, self.elementCount));
		self.elements.width(self.elementWidth);
		
		// element group갯수가 1개뿐인 경우에는 loop할 수 없음
		if(self.maxElementGroup <= 1 && self.options.isLoop) {
			isLoop = false;
		} else {
			isLoop = self.options.isLoop;
		}
		
		$.each(self.elements, function(i, v) {
			$(v)
				.attr("elementindex", $(v).attr("elementindex") || i)
				.attr("elementposition", self.containerX + self.elementWidth * i)
				.css({
					"position": "absolute",
					"left": self.containerX + self.elementWidth * i,
					"-webkit-transform": "translateZ(0px)"		
				})
			.show();
		});
		
		// absolute position인 경우 box의 골격이 날아가므로 height를 감지하여 고정시킴
		// img가 있는 경우 height계산이 제대로 이루어지지 않을 수 있으므로 img에 onload event사용
		self._initHeight && self._initHeight();
		self.obj.height(self.elements.eq(0).outerHeight());
	};
	
	this._initHeight = function() {
		var imgs = self.obj.parent().find("img");
		
		if(imgs.length > 0) {
			imgs.bind("load", function() {
				var outerHeight = self.elements.outerHeight();
				
				if(self.obj.height() <= outerHeight) {
					self.obj.height(outerHeight);
				}
			});
		}

		// 한번만 실행!
		self._initHeight = null;
	};
	
	this._initShadow = function() {
		var parent = self.elements.parent();
		
		// make shadow elements!!!
		// shadowBefore는 모든 경우에서 생성해야함
		var shadowBefore = $(self.elements.slice(-(self.elementCountPerGroup)).clone().get().reverse());
		$.each(shadowBefore, function(i, v) {
			$(v)
				.attr("elementposition", self.containerX + -self.elementWidth - self.elementWidth * i)
				.css({
					left: self.containerX + -self.elementWidth - self.elementWidth * i
				});
		});
		
		parent.prepend(shadowBefore.get().reverse());
		
		// shadowAfter는 배열이 완성형이 아닌 경우에만 생성해야한다
		if(self.elementCount % self.elementCountPerGroup != 0) {
			
			// 비완성배열을 완성형으로 메꾸고 그 뒤 하나의 완성그룹을 더 추가해준다
			var shadowAfter = self.elements.slice(0, self.elementCountPerGroup + (self.elementCount % self.elementCountPerGroup)).clone();
			$.each(shadowAfter, function(i, v) {
				$(v)
					.attr("elementposition", self.containerX + self.elementWidth * self.elementCount + self.elementWidth * i)
					.css({
						left: self.containerX + self.elementWidth * self.elementCount + self.elementWidth * i 
					});
			});
			
			parent.append(shadowAfter);
		}
		
		// re-select elements
		self.elements = self.obj.find(self.elementsSelector);		
	};
	
	this._init = function() {
		// dimension
		self._initDimension();
		
		// shadow
		// shadow는 그룹이 1이상인 경우와 isLoop인 경우만 초기생성한다
		if(self.maxElementGroup > 1 && isLoop) {
			self._initShadow();
		}
		
		// auto scroll
		if(self.options.isAutoScroll) {
			self.activateAutoScroll();
		}
	};
	
	/**
	 * swipe plugin의 기능을 불러온다
	 * load를 하기전 swipeOptions의 옵션을 모두 세팅해 두어야 한다
	 */
	this.load = function(callback) {
		self._init();
		
		self.scrollElements = self.scrollElementsByTranslate;
		
		// load touchSwipe
		self.obj.swipe(self.swipeOptions);
		
		if(callback && callback instanceof Function) {
			callback(self);
		}
		
		return self;
	};
	
	/**
	 * element들을 모두 재배치한다
	 */
	this.reload = function(callback) {
		if(isLoop) {
			// 현재 페이지의 배열부터 원본 배열크기까지 남겨두고 모두 제거 
			self.elements.not(self.elements.slice(self.elementCountPerGroup, self.elementCountPerGroup + self.elementCount)).remove();
			
			// element left값 재정렬
			var firstElementX = parseInt(self.elements.eq(0).css("left"));		
			$.each(self.elements, function(i, v) {
				$(v)
					.attr("elementposition", firstElementX + self.elementWidth * i)
					.css({
						left: firstElementX + self.elementWidth * i
					});
			});
			
			// element들을 다시 선택하고
			self.elements = self.obj.find(self.elementsSelector);		
			
			// setTimeout을 통해 multi-thread효과를 냄 (좀더 자연스럽게 보이기 위함..)
			setTimeout(function() {			
				// 초기화실행
				self._init();
				
				// left위치를 재조정
				// group이 하나만 있는 경우에는 제일 앞 element로 이동시킴
				if(self.maxElementGroup <= 1) {
					self.scrollElements(self.containerX = parseInt(self.elements.eq(0).css("left")), 0);
					self.currentPageNo = 0;
				} else {
					self.scrollElements(self.containerX = parseInt(self.elements.eq(self.elementCountPerGroup).css("left")), 0);
				}
				
				if(callback && callback instanceof Function) {
					callback(self);
				}				
			}, 0);
		}
		
		else {
			// element left값 재정렬
			var firstElementX = parseInt(self.elements.eq(0).css("left"));		
			$.each(self.elements, function(i, v) {
				$(v)
					.attr("elementposition", firstElementX + self.elementWidth * i)
					.css({
						left: firstElementX + self.elementWidth * i
					});
			});
			
			// element들을 다시 선택하고
			self.elements = self.obj.find(self.elementsSelector);		
			
			// setTimeout을 통해 multi-thread효과를 냄 (좀더 자연스럽게 보이기 위함..)
			setTimeout(function() {			
				// 초기화실행
				self._init();
				
				// left위치를 재조정
				// group이 하나만 있는 경우에는 제일 앞 element로 이동시킴
				if(self.maxElementGroup <= 1) {
					self.scrollElements(self.containerX = parseInt(self.elements.eq(0).css("left")), 0);
					self.currentPageNo = 0;
				} else {
					self.scrollElements(self.containerX = parseInt(self.elements.eq(self.elementCountPerGroup).css("left")), 0);
				}
				
				if(callback && callback instanceof Function) {
					callback(self);
				}				
			}, 0);
		}
	};
	
	/**
	 * 	성공적으로 swipe되어 left, right가 발동되었을때 필요한 사후 로직작성
	 */
	this.success = function() {};
	
	/**
	 * mouse로 scrolling할 경우 contextmenu가 나타나지 않도록 조치한다
	 * swipe가 되었을때만 contextmenu가 나타나지 않도록 하는것이 좋다
	 */
	this.contextMenuEventHandler = function(event) { return false; };	
	
	/**
	 * Catch each phase of the swipe.
	 * move : we drag the div.
	 * cancel : we animate back to where we were
	 * end : we animate to the next element
	 */
	this.swipeStatus = function(event, phase, direction, distance) {		
		self.swipeStatusByTranslate(event, phase, direction, distance);
		self.scrollElements = self.scrollElementsByTranslate;
		
		// swipe가 되었을때만 contextmenu가 나타나지 않도록 하는것이 좋다
		if(phase == "end") {
			self.obj.get(0).oncontextmenu = self.contextMenuEventHandler;
		} else {
			self.obj.get(0).oncontextmenu = null;
		}
	};
	
	this.swipeStatusByTranslate = function(event, phase, direction, distance) {
		var currentX = self.containerX;
		
		// If we are moving before swipe, and we are going Lor R in X mode, or U or D in Y mode then drag.
		// 위아래로 스크롤 할때는 작동하지 않도록 막는다
		if(phase == "move" && (direction == "up" || direction == "down")) {
			self.lock = true;
			
			if(distance > 0) {
				self.scrollElements(currentX, self.options.speed);
			}
			
			return;
		} 
		
		else if(self.lock && (phase == "cancel" || phase == "end")) {
			self.lock = false;
			
			return;
		}
		
		else if(self.lock) {
			return;
		}
		
		else if(phase == "move" && (direction == "left" || direction=="right")) {
			// auto scroll
			if(self.options.isAutoScroll) {
				self.deactivateAutoScroll();
			}			
			
			var duration = 0;
			
			if(direction == "left") {
				self.scrollElements(currentX + distance, duration);
			}
			
			else if(direction == "right") {
				self.scrollElements(currentX - distance, duration);
			}
		}
		
		else if(phase == "cancel") {
			self.scrollElements(currentX, self.options.speed);
			
			// auto scroll
			if(self.options.isAutoScroll) {
				self.activateAutoScroll();
			}				
		}
		
		else if(phase == "end") {
			if(direction == "right") {
				self.previousElement();
			} else if(direction == "left") {			
				self.nextElement();
			}
			
			// auto scroll
			if(self.options.isAutoScroll) {
				self.activateAutoScroll();
			}				
		}
	};
	
	this.previousElement = function(times, isExecuteSuccess, speed) {
		times = times || 1;
		isExecuteSuccess = isExecuteSuccess || true;
		speed = speed || self.options.speed;
		
		if(isLoop) {
			self.currentPositionGroup -= times;
			self.currentPageNo = self.currentPageNo - times;
			
			if(self.currentPageNo <= -1) {
				self.currentPageNo = self.maxElementGroup + self.currentPageNo;
			} else if(self.currentPageNo >= self.maxElementGroup) {
				self.currentPageNo = self.currentPageNo - self.maxElementGroup;
			}	
			
			var currentX = self.containerX = self.containerX - self.elementWidth * self.elementCountPerGroup * times;
			self.scrollElements(currentX, speed);
			
			// make shadow elements!!!
			// 제일 앞 element의 X좌표
			var firstElementX = parseInt(self.elements.eq(0).css("left"));
			
			// 제일 앞 element의 index번호
			var firstElementIndex = parseInt(self.elements.eq(0).attr("elementindex")) - self.elementCountPerGroup;
			if(firstElementIndex < 0) {
				firstElementIndex = (self.elementCount) + firstElementIndex;
			}
			
			// 앞에다 붙일 shadow element는 제일 뒤 원본 element의 수만큼을 잡아둔다 
			var shadowBeforeTemp = self.elements.slice(-(self.elementCount));
			
			// 기준이 되는 index를 찾는다
			var shadowBeforeBaseIndex = 0;
			shadowBeforeTemp.each(function(i, v) {
				if($(v).attr("elementindex") == firstElementIndex) {
					shadowBeforeBaseIndex = i;
					return;
				}
			});

			// 기준index를 시작으로 slice한다
			var shadowBefore = shadowBeforeTemp.slice(shadowBeforeBaseIndex, shadowBeforeBaseIndex + self.elementCountPerGroup).clone();
			
			// slice한 array가 그룹 element보다 작을 경우 젤 앞에서 부족한 수만큼 채워넣는다
			if(shadowBefore.length < self.elementCountPerGroup) {
				shadowBefore = shadowBefore.add(shadowBeforeTemp.slice(0, self.elementCountPerGroup - shadowBefore.length).clone());
			}
			
			// swipe와 동시에 element위치를 handling하므로 뚝뚝 끊기는듯한 느낌이 있어
			// setTimeout을 통해 multi-thread효과를 냄
			setTimeout(function() {
				$.each(shadowBefore, function(i, v) {
					$(v)
						.attr("elementposition", firstElementX + -self.elementWidth - self.elementWidth * (shadowBefore.length - 1 - i))
						.css({
							"left": firstElementX + -self.elementWidth - self.elementWidth * (shadowBefore.length - 1 - i)
						});
				});
				
				self.elements.parent().prepend(shadowBefore);
				
				// 제일 뒤 그룹을 삭제한다
				self.elements.slice(-(self.elementCountPerGroup)).remove();
				self.elements = self.obj.find(self.elementsSelector);
			}, 0);				
		} 
		
		else {
			if(self.currentPageNo <= 0) {
				self.scrollElements(self.containerX, speed);			
			}
			
			else {
				self.currentPositionGroup = Math.max(self.currentPositionGroup - times, 0);
				self.currentPageNo = Math.max(self.currentPageNo - times, 0);
				
				var currentX = self.containerX = self.containerX - self.elementWidth * self.elementCountPerGroup * times;
				self.scrollElements(currentX, speed);			
			}
		}
		
		if(isExecuteSuccess) {
			setTimeout(self.success, 0);
		}
	};
	
	this.nextElement = function(times, isExecuteSuccess, speed) {
		times = times || 1;
		isExecuteSuccess = isExecuteSuccess || true;
		speed = speed || self.options.speed;		
		
		if(isLoop) {
			self.currentPositionGroup += times;
			self.currentPageNo = self.currentPageNo + times;
			
			if(self.currentPageNo <= -1) {
				self.currentPageNo = self.maxElementGroup + self.currentPageNo;
			} else if(self.currentPageNo >= self.maxElementGroup) {
				self.currentPageNo = self.currentPageNo - self.maxElementGroup;
			}
			
			var currentX = self.containerX = self.containerX + self.elementWidth * self.elementCountPerGroup * times;		
			self.scrollElements(currentX, speed);
			
			// make shadow elements!!!
			// 제일 뒤 element의 X좌표
			var lastElementX = parseInt(self.elements.eq(-1).css("left"));
			
			// 제일 뒤 element의 index번호
			var lastElementIndex = parseInt(self.elements.eq(-1).attr("elementindex")) + 1;
			if(lastElementIndex >= self.elementCount) {
				lastElementIndex = lastElementIndex - self.elementCount;
			}
			
			// 앞에다 붙일 shadow element는 제일 앞 원본 element의 수만큼을 잡아둔다 
			var shadowAfterTemp = self.elements.slice(0, self.elementCount);
			
			// 기준이 되는 index를 찾는다
			var shadowAfterBaseIndex = 0;
			shadowAfterTemp.each(function(i, v) {
				if($(v).attr("elementindex") == lastElementIndex) {
					shadowAfterBaseIndex = i;
					return;
				}
			});

			// 기준index를 시작으로 slice한다
			var shadowAfter = shadowAfterTemp.slice(shadowAfterBaseIndex, shadowAfterBaseIndex + self.elementCountPerGroup).clone();
			
			// slice한 array가 그룹 element보다 작을 경우 젤 앞에서 부족한 수만큼 채워넣는다
			if(shadowAfter.length < self.elementCountPerGroup) {
				shadowAfter = shadowAfter.add(shadowAfterTemp.slice(0, self.elementCountPerGroup - shadowAfter.length).clone());
			}
			
			// swipe와 동시에 element위치를 handling하므로 뚝뚝 끊기는듯한 느낌이 있어
			// setTimeout을 통해 multi-thread효과를 냄
			setTimeout(function() {
				$.each(shadowAfter, function(i, v) {
					$(v)
						.attr("elementposition", lastElementX + self.elementWidth * (i + 1))
						.css({
							"left": lastElementX + self.elementWidth * (i + 1) 
						});
				});
				
				self.elements.parent().append(shadowAfter);
				
				// 제일 앞 그룹을 삭제한다
				self.elements.slice(0, self.elementCountPerGroup).remove();
				self.elements = self.obj.find(self.elementsSelector);
			}, 0);	
			
		} 
		
		else {
			if(self.currentPageNo >= self.maxElementGroup - 1) {
				self.scrollElements(self.containerX, speed);			
			}
			
			else {
				self.currentPositionGroup = Math.min(self.currentPageNo + 1, self.maxElementGroup - 1);
				self.currentPageNo = Math.min(self.currentPageNo + 1, self.maxElementGroup - 1);
				
				var currentX = self.containerX = self.containerX + self.elementWidth * self.elementCountPerGroup * times;		
				self.scrollElements(currentX, speed);
			}			
		}
		
		if(isExecuteSuccess) {
			setTimeout(self.success, 0);
		}
	};
	
	/**
	 * 해당 index번호로 이동한다
	 * @param index
	 */
	this.moveTo = function(index, isExecuteSuccess, speed) {
		var times = 0;
		
		if(index > self.currentPageNo) {
			times = Math.min(index - self.currentPageNo, (self.maxElementGroup - 1) - self.currentPageNo);
			
			if(times > 0) {
				var currentIndex = self.elements.slice(self.elementCountPerGroup).filter("[elementindex=" + self.currentPageNo * self.elementCountPerGroup + "]").index();	
				var beforeGroupCount = Math.ceil(self.elements.slice(0, currentIndex).length / self.elementCountPerGroup) - 1;
				var afterGroupCount = Math.ceil(self.elements.slice(currentIndex).length / self.elementCountPerGroup) - 1;
				
				if(times > afterGroupCount) {
					self.previousElement(self.maxElementGroup - times, isExecuteSuccess, speed);
				} else {
					self.nextElement(times, isExecuteSuccess, speed);
				}
			}
		} 
		
		else if(index < self.currentPageNo) {
			times = Math.min(self.currentPageNo - index, self.currentPageNo);
			
			if(times > 0) {
				var currentIndex = self.elements.slice(self.elementCountPerGroup).filter("[elementindex=" + self.currentPageNo * self.elementCountPerGroup + "]").index();	
				var beforeGroupCount = Math.ceil(self.elements.slice(0, currentIndex).length / self.elementCountPerGroup) - 1;
				var afterGroupCount = Math.ceil(self.elements.slice(currentIndex).length / self.elementCountPerGroup) - 1;
				
				if(times > beforeGroupCount) {
					self.nextElement(self.maxElementGroup - times, isExecuteSuccess, speed);
				} else {
					self.previousElement(times, isExecuteSuccess, speed);
				}				
			}
		}
	};
	
	this.getCurrentElements = function() {
		var index = self.elements.filter("[elementposition='" + self.getCurrentElementPosition() + "']").index();
		var currentElementGroup = Math.floor(index / self.elementCountPerGroup);
		
		return self.elements.slice(currentElementGroup * self.elementCountPerGroup, (currentElementGroup + 1) * self.elementCountPerGroup);		
	};
	
	this.getCurrentElementPosition = function() {
		return self.obj.attr("elementposition") || 0;
	};
	
	this.activateAutoScroll = function() {
		// group이 하나인경우는 autoScroll불가
		if(self.maxElementGroup == 1) {
			if(autoScrollInterval) {
				clearInterval(autoScrollInterval);
			}			
			
			return;
		}
		
		if(autoScrollInterval) {
			clearInterval(autoScrollInterval);
		}
		
		if(self.options.autoScrollDirection == "left") {
			if(!isLoop && self.currentPageNo == 0) {
				self.options.autoScrollDirection = "right";
				self.activateAutoScroll();
				
				return;
			}
			
			autoScrollInterval = setInterval(function() { 
				self.previousElement(); self.activateAutoScroll(); 
			}, self.options.autoScrollTime);
		} 
		
		else {
			if(!isLoop && self.currentPageNo == (self.maxElementGroup - 1)) {
				self.options.autoScrollDirection = "left";
				self.activateAutoScroll();
				
				return;
			}			
			
			autoScrollInterval = setInterval(function() { 
				self.nextElement(); self.activateAutoScroll(); 
			}, self.options.autoScrollTime);
		}
	};
	
	this.deactivateAutoScroll = function() {
		if(autoScrollInterval) {
			clearInterval(autoScrollInterval);
		}
	};
	
	/**
	 * window의 사이즈가 바뀔때마다 이미지의 wrapper의 width가 유동적으로 바뀌어야 하므로
	 * 변경될 로직을 작성하여 함수로 둔다 
	 */
	this.onresize = function() {
		if(self.currentWindowSize != $(window).width()) {
			self.currentWindowSize = $(window).width();
			self.reload();
		}
	};
	
	// bind window.onresize
	if(navigator.userAgent.search("iPhone|iPod|iPad") > -1) {
		$(window).bind("orientationchange", function() { self.onresize(); });	
	} else {
		$(window).bind("resize", function() { self.onresize(); });	
	}
	
	/**
	 * element를 scroll하기 위한 function, 모드에 따라 나뉜다
	 */
	this.scrollElements = function() {};
	
	/**
	 * translate3d방식으로 element를 scrolling한다
	 */
	this.scrollElementsByTranslate = function(distance, duration) {
		self.obj.css("-webkit-transition-duration", (duration / 1000).toFixed(1) + "s");
		
		distance = distance || 0;
		
		//inverse the number we set in the css
		var value = (distance < 0 ? "" : "-") + Math.abs(distance).toString();
		
		self.obj.attr("elementposition", -value);
		self.obj.css("-webkit-transform", "translate3d(" + value + "px, 0px, 0px)");
	};
	
	// 본 객체를 action에 등록해준다
	BaramangSwipe.action[this.obj.attr("id") || new Date().getMilliseconds()] = this;
};

$.fn.baramangSwipe = function(elements, options) {
	this.baramangSwipe = new BaramangSwipe.model($(this), elements, options);
	
	return this.baramangSwipe;
};

})(jQuery);