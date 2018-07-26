import React, {Fragment} from 'react'
//import {Accordion} from 'semantic-ui-react'

import {ActionLink} from 'components/ui/DbLink'
//import Rotation from 'components/ui/Rotation'
import ACTIONS from 'data/ACTIONS'
//import STATUSES from 'data/STATUSES'
import Module from 'parser/core/Module'
import {Suggestion, SEVERITY} from 'parser/core/modules/Suggestions'

// 1 sen value for each finisher. using finisher with sen you already have is bad.
const MAX_GEKKO_SEN = 1
const MAX_KASHA_SEN = 1
const MAX_YUKIKAZE_SEN = 1

//future-proofing for more kenki actions

const MAX_KENKI = 100

const KENKI_BUILDERS = {

	//single target
	[ACTIONS.GEKKO.id]: 10,
	[ACTIONS.KASHA.id]: 10,
	[ACTIONS.YUKIKAZE.id]: 10,
	[ACTIONS.HAKAZE.id]: 5,
	[ACTIONS.JINPU.id]: 5,
	[ACTIONS.SHIFU.id]: 5,
	//aoe
	[ACTIONS.MANGETSU.id]: 10,
	[ACTIONS.OKA.id]: 10,
	[ACTIONS.FUGA.id]: 5,
	//ranged
	[ACTIONS.ENPI.id]: 10,
}

const KENKI_SPENDERS = {
	[ACTIONS.HISSATSU_GYOTEN.id]: 10,
	[ACTIONS.HISSATSU_YATEN.id]: 10,
	[ACTIONS.HISSATSU_SEIGAN.id]: 15,
	[ACTIONS.HISSATSU_KAITEN.id]: 20,
	[ACTIONS.HISSATSU_SHINTEN.id]: 25,
	[ACTIONS.HISSATSU_KYUTEN.id]: 25,
	[ACTIONS.HISSATSU_GUREN.id]: 50,
}

export default class Sen extends Module {
	static handle = 'sen'
	static dependencies = [
		'combatants',
		'cooldowns',
		'gcd',
		'kenki',
		'suggestions',
	]

	_gekkosen = 0
	_kashasen = 0
	_yukikazesen = 0

	_wastedsen = 0

	_kenki = 0
	_wastedKenki = 0

	constructor(...args) {
		super(...args)
		this.addHook('cast', {by: 'player'}, this._onCast)
		this.addHook('death', {to: 'player'}, this._onDeath)
		this.addHook('complete', this._onComplete)

	}

	_onCast(event) {
		const actionId = event.ability.guid

		//check kenki gain/dump
		
		if (KENKI_BUILDERS[abilityId]) {
			this._addKenki(abilityId)
		}
		if (KENKI_SPENDERS[abilityId]) {
			this._kenki -= KENKI_SPENDERS[abilityId]
		}
	

		//check if it's a sen gain or dump then handle it.

		if (actionId === ACTIONS.HAGAKURE.id) {
			this._Sen2Kenki()
		}
		 if (actionId ===ACTIONS.HIGANBANA.id || actionId === ACTIONS.TENKA_GOKEN.id || actionId === ACTIONS.MIDARE_SETSUGEKKA.id) {
			this._removeSen()
		}
		if (actionId === ACTIONS.GEKKO.id || actionId === ACTIONS.MANGETSU.id) {
			this._addGekkoSen()
		}
		if (actionId === ACTIONS.KASHA.id || actionId === ACTIONS.OKA.id) {
			this._addKashaSen()
		}
		if (actionId === ACTIONS.YUKIKAZE.id) {
			this._addYukikazeSen()
		}
	}
	
	//sen shit below

	_addGekkoSen() {
		this._gekkosen += 1
		if (this._gekkosen > MAX_GEKKO_SEN) {
			const waste = this._gekkosen - MAX_GEKKO_SEN
			this._wastedsen += waste
			return waste
		}
		return 0
	}

	_addKashaSen() {
		this._kashasen += 1
		if (this._kashasen > MAX_KASHA_SEN) {
			const waste = this._kashasen - MAX_KASHA_SEN
			this._wastedsen += waste
			return waste
		}
		return 0
	}

	_addYukikazeSen()  {
		this._yukikazesen += 1
		if (this._yukikazesen > MAX_YUKIKAZE_SEN) {
			const waste = this._yukikazesen - MAX_YUKIKAZE_SEN
			this._wastedsen += waste
			return waste
		}
		return 0
	}

	_removeSen() {
		this._gekkosen = 0
		this._kashasen = 0
		this._yukikazesen = 0

		return 0
	}

	//kenki maths

		_addKenki(abilityId) {
		this._kenki += KENKI_BUILDERS[abilityId]
		if (this._kenki > MAX_KENKI) {
			const waste = this._kenki - MAX_KENKI
			this._wastedKenki += waste
			this._kenki = MAX_KENKI
			return waste
		}
		return 0
	}

	_Sen2Kenki() {
		this._kenki += ((this._gekkosen + this._kashasen + this._yukikazesen) * 20)
		if (this.kenki > MAX_KENKI) {
			const waste = this._kenki - MAX_KENKI
			this._wastedKenki += waste
			this._kenki = MAX_KENKI
			return waste
		}
		this._gekkosen = 0
		this._kashasen = 0
		this._yukikazesen = 0

		return 0
	}
	_onDeath() {
		//Death is such a waste
		this._wastedsen += (this._gekkosen + this._kashasen + this._yukikzaesen)

		this._gekkosen = this._kashasen = this._yukikazesen = 0

		this._wastedKenki += this._kenki

		this._kenki = 0
	}

	_onComplete() {
		if (this._wastedsen >= 1) {
			this.suggestions.add(new Suggestion({
				icon: ACTIONS.MEIKYO_SHISUI.icon,
				content: <Fragment>
					You used <ActionLink {...ACTIONS.GEKKO}/>, <ActionLink {...ACTIONS.KASHA}/>, <ActionLink {...ACTIONS.YUKIKAZE}/>, at a time when you already had that sen, thus wasting a combo because it did not give you sen.
				</Fragment>,
				severity: this._wastedsen === 1? SEVERITY.MINOR : this._wastedsen >= 3? SEVERITY.MEDIUM : SEVERITY.MAJOR,
				why: <Fragment>
					You lost {this._wastedsen} sen by using finishing combos that gave you sen you already had.
				</Fragment>,
			}))
		}
	}


		if (this._wastedKenki >= 20) {
			this.suggestions.add(new Suggestion({
				icon: ACTIONS.HAKAZE.png,
				content: <Fragment>
					You used kenki builders in a way that overcapped you.
				</Fragment>,
				severity: this._wastedKenki === 20? SEVERITY.MINOR : this._wastedKenki >= 50? SEVERITY.MEDIUM : SEVERITY.MAJOR,
				why: <Fragment>
					You wasted {this._wastedKenki} kenki by using abilities that sent you over the cap.
				</Fragment>,
			}))
		}
	}
}

