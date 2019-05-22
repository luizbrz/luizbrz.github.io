define("robotTW2/CommandSpy", [
	], function(){
	return {}
})

define("robotTW2/services/SpyService", [
	"robotTW2",
	"robotTW2/time",
	"helper/time",
	"robotTW2/conf",
	"conf/spyTypes",
	"robotTW2/databases/data_villages",
	"robotTW2/databases/data_spy",
	"robotTW2/CommandSpy"
	], function(
			robotTW2,
			time,
			helper,
			conf,
			SPY_TYPES,
			data_villages,
			data_spy,
			commandSpy
	){
	return (function SpyService(
			$rootScope,
			socketService,
			providers,
			modelDataService,
			$timeout,
			commandQueue,
			ready,
			loadScript,
			loadController
	) {

		var isInitialized = !1
		, isRunning = !1
		, listener = undefined
		, interval_spy = undefined
		, listener_spy = undefined
		, listener_open = undefined
		, listener_close = undefined
		, interval_handler = undefined
		, list = []
		, counterMeasureTypes = {
				CAMOUFLAGE: "camouflage",
				DUMMIES: "dummies",
				EXCHANGE: "exchange",
				SWITCH_WEAPONS: "switch_weapons"
		}
		, getMaxSpies = function(researches, level){
			var a, b, c = {}, d;
			for (a in researches)
				for (b in counterMeasureTypes)
					counterMeasureTypes[b] === a && (c[a] = researches[a]);

			d = Object.keys(c).map(function(key, index, array){
				if (c[key].required_level <= level) {
					return c[key]
				} else {
					return
				}
			}).filter(f => f != undefined);

			return level > 0 ? Object.keys(d).length + 1 : 0;
		}
		, recruit_spy = function (){
			Object.keys(data_villages.villages).forEach(function(id){
				var selectedVillage = modelDataService.getSelectedCharacter().getVillage(id);
				if(selectedVillage && selectedVillage.data.buildings) {
					var scoutingInfo = selectedVillage.scoutingInfo;
					var spies = scoutingInfo.spies;
					var prices = scoutingInfo.getData().spy_prices;
					var maxSpies = getMaxSpies(selectedVillage.data.buildings.tavern.researches, selectedVillage.data.buildings.tavern.level);
					var count = 0;
					for (i = 0; i < maxSpies; i++ ){
						var spy = spies[i];
						spy.affordable = !Object.keys(selectedVillage.getResources().getComputed()).map(
								function(elem){
									if(["wood", "clay", "iron"].some(f=> f== elem)){
										if(selectedVillage.getResources().getComputed()[elem].currentStock > prices[i][elem]) {
											return true
										} else {
											return false
										}
									} else {
										return undefined;
									}
								}
						).filter(elem => elem != undefined).some(elem => elem == false)
						if(spy.type == SPY_TYPES.RECRUITING && spy.timeCompleted != null){
							list.push(spy.timeCompleted);
						}
						if ((spy.type === SPY_TYPES.NO_SPY) && spy.affordable) {
							socketService.emit(providers.routeProvider.SCOUTING_RECRUIT, {
								'village_id'	: selectedVillage.getId(),
								'slot'			: spy.id
							});
						};
					}

				}

			})
			wait();
		}
		, setList = function(callback){
			list.push(conf.INTERVAL.SPY)
			data_spy.interval < conf.MIN_INTERVAL ? list.push(conf.MIN_INTERVAL) : list.push(data_spy.interval)
					var t = Math.min.apply(null, list)
					data_spy.interval = t
					data_spy.complete = time.convertedTime() + t
					list = [];
			data_spy.set();
			$rootScope.$broadcast(providers.eventTypeProvider.INTERVAL_CHANGE_SPY)
			if(callback && typeof(callback) == "function"){callback(t)}
		}
		, wait = function(){
			setList(function(tm){
				if(!interval_spy){
					interval_spy = $timeout(function(){recruit_spy()}, tm)
				} else {
					$timeout.cancel(interval_spy);
					interval_spy = undefined;
					interval_spy = $timeout(function(){recruit_spy()}, tm)
				}
			});
		}
		, addAttackSpy = function(params, opt_id){
			if(!params){return}
			!(typeof(listener) == "function") ? listener = $rootScope.$on(providers.eventTypeProvider.SCOUTING_SENT, listener_command_sent) : null;
			var expires = params.data_escolhida - params.duration
			, timer_delay = (expires - time.convertedTime()) + robotTW2.databases.data_main.time_correction_command
			, id_command = (Math.round(time.convertedTime() + params.data_escolhida).toString());

			if(opt_id){
				id_command = params.id_command
			}

			if(timer_delay >= 0){
				angular.extend(params, {
					"timer_delay" : timer_delay,
					"id_command": id_command
				})

				commandQueue.bind(id_command, sendAttackSpy, data_spy, params, function(fns){
					commandSpy[fns.params.id_command] = {
							"timeout" 	: fns.fn.apply(this, [fns.params]),
							"params"	: params
					}
				})
			}
		}
		, resend = function (params) {
			commandQueue.bind(params.id_command, resendAttackSpy, data_spy, params, function(fns){
				commandSpy[fns.params.id_command] = {
						"timeout" 	: fns.fn.apply(this, [fns.params]),
						"params"	: params
				}
			})
		}
		, listener_command_sent = function($event, data){
			if(!$event.currentScope){return}
			if(data.direction == "forward" && data.type == "spy"){
				var params = Object.keys(commandSpy).map(function(cmd){
					if(commandSpy[cmd].params.start_village == data.home.id
							&& commandSpy[cmd].params.target_village == data.target.id
					) {
						return commandSpy[cmd].params	
					} else {
						return undefined
					}
				}).filter(f => f != undefined)

				let param = undefined;
				if(params.length){
					params.sort(function(a,b){return a.data_escolhida - b.data_escolhida})
					param = params.shift();
				}

				$rootScope.$broadcast(providers.eventTypeProvider.CHANGE_COMMANDS)
			}
		}
		, send = function(params){
			var village = modelDataService.getSelectedCharacter().getVillage(params.start_village)
			let qtd_spy = village.getScoutingInfo().getNumAvailableSpies();
			if(qtd_spy < params.spys){
				params.spys = qtd_spy
			}
			if(params.spys != 0){
				socketService.emit(providers.routeProvider.SCOUTING_SEND_COMMAND, {
					'startVillage': params.start_village,
					'targetVillage': params.target_village,
					'spys': params.spys,
					'type': params.type
				});
			}

			removeCommandAttackSpy(params.id_command)
		}
		, sendAttackSpy = function(params){
			var that = this;
			return $timeout(resend.bind(null, params), params.timer_delay - conf.TIME_DELAY_UPDATE)
		}
		, resendAttackSpy = function(params){
			var expires_send = params.data_escolhida - params.duration
			, timer_delay_send = (expires_send - time.convertedTime()) + robotTW2.databases.data_main.time_correction_command;

			if(timer_delay_send < 0){
				removeCommandAttackSpy(params.id_command)
				return 
			}
			return $timeout(send.bind(null, params), timer_delay_send)
		}
		, sendCommandAttackSpy = function(scp){
			let vl;
			if(scp.rangeSlider){
				vl = scp.rangeSlider.value
			} else {
				vl = scp.qtd
			}
			let opt;
			if(scp.option){
				opt = scp.option
			} else {
				opt = scp.type
			}
			var params = {
					start_village		: scp.startId,
					target_village		: scp.targetId,
					target_x			: scp.targetX,
					target_y			: scp.targetY,
					target_name			: scp.targetVillage,
					spys				: vl,
					duration			: scp.milisegundos_duracao,
					type				: opt,
					data_escolhida		: scp.tempo_escolhido
			}
			addAttackSpy(params);
		}
		, removeCommandAttackSpy = function(id_command){
			if(typeof(commandSpy[id_command].timeout) == "object"){
				if(commandSpy[id_command].timeout.$$state.status == 0){
					$timeout.cancel(commandSpy[id_command].timeout)	
				}
				delete commandSpy[id_command];
			}

			commandQueue.unbind(id_command, data_spy)
		}
		, removeAll = function(){
			Object.keys(commandSpy).map(function(elem){
				if(typeof(commandSpy[elem].timeout) == "object"){
					if(commandSpy[elem].timeout.$$state.status == 0){
						$timeout.cancel(commandSpy[elem].timeout)	
					}
					delete commandSpy[elem];
				}
			})
			commandQueue.unbindAll("units", data_spy)
			commandQueue.unbindAll("buildings", data_spy)
		}
		, init = function (){
			isInitialized = !0
			loadScript("/controllers/SpyCompletionController.js");
			start();
		}
		, start = function (){
			if(isRunning){return}
			ready(function(){
				var open = false;
				loadScript("/controllers/SpyCompletionController.js", true);
				listener_open = $rootScope.$on("open_get_selected_village", function(){open = true})
				listener_close = $rootScope.$on("close_get_selected_village", function(){open = false})
				interval_handler = setInterval(function(){
					var ModalSendSpiesController = loadController("ModalSendSpiesController")
					if(!open && ModalSendSpiesController){
						$rootScope.$broadcast("get_selected_village")
					}
				}, 1000);
				data_spy.interval = conf.INTERVAL.SPY;
				isRunning = !0;
				!listener_spy ? listener_spy = $rootScope.$on(providers.eventTypeProvider.SCOUTING_SPY_PRODUCED, recruit_spy) : listener_spy;
				$rootScope.$broadcast(providers.eventTypeProvider.ISRUNNING_CHANGE, {name:"SPY"})
				recruit_spy();
				if(!data_spy.commands){data_spy.commands = {}}
				Object.values(data_spy.commands).forEach(function(param){
					if((param.data_escolhida - param.duration) < time.convertedTime()){
						commandQueue.unbind(param.id_command, data_spy)
					} else {
						addAttackSpy(param, true);
					}
				})
			}, ["all_villages_ready"])
		}
		, stop = function (){
			robotTW2.removeScript("/controllers/SpyCompletionController.js");
			typeof(listener_spy) == "function" ? listener_spy(): null;
			typeof(listener) == "function" ? listener(): null
					listener_spy = undefined;
			listener_open = undefined;
			listener_close = undefined;
			interval_handler = undefined;
			isRunning = !1
			$rootScope.$broadcast(providers.eventTypeProvider.ISRUNNING_CHANGE, {name:"SPY"})
			$timeout.cancel(interval_spy);
			interval_spy = undefined;
		}
		return	{
			init					: init,
			start					: start,
			stop 					: stop,
			sendCommandAttackSpy 	: sendCommandAttackSpy,
			removeCommandAttackSpy	: removeCommandAttackSpy,
			removeAll				: removeAll,
			isRunning				: function() {
				return isRunning
			},
			isInitialized			: function(){
				return isInitialized
			},
			version					: conf.VERSION.SPY,
			name					: "spy"
		}

	})(
			robotTW2.services.$rootScope,
			robotTW2.services.socketService,
			robotTW2.providers,
			robotTW2.services.modelDataService,
			robotTW2.services.$timeout,
			robotTW2.commandQueue,
			robotTW2.ready,
			robotTW2.loadScript,
			robotTW2.loadController
	)
})
