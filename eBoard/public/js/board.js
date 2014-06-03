var ctx;
var socket;

$(document).ready(function(){
	ctx = $('#cv').get(0).getContext('2d');
	
	$('#cv').bind('mousedown',draw.start);
	$('#cv').bind('mousemove',draw.move);
	$('#cv').bind('mouseup',draw.end);
	
	shape.setShape();
	
	$('#clear').bind('click',draw.clear);
	
	for(var key in color_map){
		$('#pen_color').append('<option value=' + color_map[key].value + '>' +  color_map[key].name + '</option>');
	}

	for(var i = 2 ; i < 15 ; i++){
		$('#pen_width').append('<option value=' + i + '>' +  i + '</option>');
	}
	
	$('select').bind('change',shape.change);

	socket = io.connect('http://' + window.location.host);
	
	socket.on('linesend_toclient', function (data) {
		draw.drawfromServer(data);
	});
	
	$('#btn_map').bind('click',mapObj.init);
	$('#btn_map_close').bind('click',mapObj.close);
	
	socket.on('map_toclient', function (data) {
		mapObj.drawfromServer(data);
	});
	
	$('#btn_raodview, #btn_raodview_close').hide();
	$('#btn_raodview').bind('click',mapObj.roadview);
	$('#btn_raodview_close').bind('click',mapObj.roadviewClose);

});

var mapObj = {
	
	init : function(){
		if(map == undefined || $('#map').css('display') == 'none'){
			var x = 37.571811;
			var y = 126.976481;
	
			$('#map').css('display','block');
			map = new daum.maps.Map(document.getElementById('map'), {
				center: new daum.maps.LatLng(x, y),
				level: 3
			});
			
			daum.maps.event.addListener(map, 'dragend',function(){
				socket.emit('map',{'type':'mapmove','x':map.getCenter().getLat(),'y':map.getCenter().getLng()});
			});
			
			daum.maps.event.addListener(map, 'zoom_changed',function(){
				socket.emit('map',{'type':'zoom','z':map.getLevel()});
			});
			
			socket.emit('map',{'type':'open','x':x,'y':y});
			
			$('#btn_raodview, #btn_raodview_close').show();
		}
	},
	
	close : function(){
		if( $('#map').css('display') == 'block'){
			$('#map').css('display','none');
			socket.emit('map',{'type':'close'});
			$('#btn_raodview, #btn_raodview_close').hide();
		}
	},
	
	drawfromServer : function(data){
		if(data.type == 'open'){
			mapObj.init(data.type,data.x,data.y);
		}
		if(data.type == 'close'){
			mapObj.close();
		}
		if(data.type == 'mapmove'){
			mapObj.mapMove(data.x,data.y);
		}
		if(data.type == 'zoom'){
			mapObj.setZoom(data.z);
		}
		if(data.type == 'roadviewopen'){
			mapObj.roadview();
		}
		if(data.type == 'roadviewclose'){
			mapObj.roadviewClose();
		}
	},
	
	mapMove : function(x,y){
		map.panTo(new daum.maps.LatLng(x, y));
	}, 
	
	setZoom : function(z){
		map.setLevel(z);
	},
	
	roadview : function(){
	
		var x = map.getCenter().Ea;
		var y = map.getCenter().Da;
		
		if($('#roadview').css('display') == 'none'){
			socket.emit('map',{'type':'roadviewopen','x':x,'y':y});
		}
		
		$('#map').css('display','none');
		$('#roadview').css('display','block');
		
		var p = new daum.maps.LatLng(map.getCenter().Ea, map.getCenter().Da);
		var rc = new daum.maps.RoadviewClient();
		var rv = new daum.maps.Roadview(document.getElementById("roadview"));
		
		$('#roadview').css('position','absolute');
		
		rc.getNearestPanoId(p, 50, function(panoid) {
					rv.setPanoId(panoid);
				});
				
		
	},
	
	roadviewClose : function(){
		if($('#roadview').css('display') == 'block'){
			$('#roadview').css('display','none');
			$('#map').css('display','block');
			socket.emit('map',{'type':'roadviewclose'});
		}
	}
}

var msg = {
	
	line : {
			send : function(type,x,y){
				console.log(type,x,y);
			 	socket.emit('linesend', { 'type': type , 'x':x , 'y':y , 'color': shape.color , 'width' : shape.width });
			}
	}
}

var color_map = 
[
	{'value':'white','name':'하얀색'},
 	{'value':'red','name':'빨간색'},
 	{'value':'orange','name':'주황색'},
 	{'value':'yellow','name':'노란색'},
 	{'value':'blue','name':'파랑색'}, 	
 	{'value':'black','name':'검은색'}
];

var shape = {
	
	color : 'white',
	width : 3,
	
	change : function(){
		
		var color = $('#pen_color option:selected').val();
		var width = $('#pen_width option:selected').val();
	
		shape.setShape(color,width);
	},
	
	setShape : function(color,width){
		
		if(color != null)
			this.color = color;
		if(width != null)
			this.width = width;
	
		ctx.strokeStyle = this.color;
		ctx.lineWidth = this.width;
		
		ctx.clearRect(703, 0, 860, 90);
		
		ctx.beginPath(); 
		ctx.moveTo(710,55);
		ctx.lineTo(820,55);
		ctx.stroke();
	}
	
}
var draw = {
	
	drawing : null,
	
	start : function(e){
		ctx.beginPath(); 
		ctx.moveTo(e.pageX,e.pageY);
		this.drawing = true;
		
		msg.line.send('start',e.pageX,e.pageY);
	},
	
	move : function(e){
		if(this.drawing){
			ctx.lineTo(e.pageX,e.pageY);
			ctx.stroke();
			msg.line.send('move',e.pageX,e.pageY);
		}

	},
	
	end : function(e){
		this.drawing = false;
		msg.line.send('end');
	},
	
	clear : function(){
		ctx.clearRect(0, 0, cv.width,cv.height);
		shape.setShape();
		msg.line.send('clear');
	},
	
	drawfromServer : function(data){
		
		if(data.type == 'start'){
			ctx.beginPath(); 
			ctx.moveTo(data.x,data.y);
			ctx.strokeStyle = data.color;
			ctx.lineWidth = data.width;
		}
		
		if(data.type == 'move'){
			ctx.lineTo(data.x,data.y);
			ctx.stroke();
		}
		
		if(data.type == 'end'){
		}

		if(data.type == 'clear'){
			ctx.clearRect(0, 0, cv.width,cv.height);
			shape.setShape();
		}

	}
}