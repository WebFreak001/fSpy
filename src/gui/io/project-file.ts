/**
 * fSpy
 * Copyright (c) 2020 - Per Gantelius
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import store from '../store/store'
import { StoreState } from '../types/store-state'
import SavedState from './saved-state'
import { AppAction, loadState, setProjectFilePath } from '../actions'
import { Dispatch } from 'redux'
import { loadImage, triggerDownload } from './util'
import { defaultResultDisplaySettings } from '../defaults/result-display-settings'
import { cameraPresets } from '../solver/camera-presets'
import { ReferenceDistanceUnit } from '../types/calibration-settings'

export default class ProjectFile {
  static readonly EXAMPLE_PROJECT_URL = import.meta.env.BASE_URL + 'example.fspy'
  static readonly PROJECT_FILE_EXTENSION = 'fspy'
  static readonly PROJECT_FILE_ID = 'fspy'
  static readonly PROJECT_FILE_VERSION = 1

  static getStateToSave(): SavedState {
    let storeState: StoreState = store.getState()
    return {
      globalSettings: storeState.globalSettings,
      calibrationSettingsBase: storeState.calibrationSettingsBase,
      calibrationSettings1VP: storeState.calibrationSettings1VP,
      calibrationSettings2VP: storeState.calibrationSettings2VP,
      controlPointsStateBase: storeState.controlPointsStateBase,
      controlPointsState1VP: storeState.controlPointsState1VP,
      controlPointsState2VP: storeState.controlPointsState2VP,
      cameraParameters: storeState.solverResult.cameraParameters,
      resultDisplaySettings: storeState.resultDisplaySettings
    }
  }

  static buildFileBuffer(): Uint8Array {
    let storeState: StoreState = store.getState()
    let imageData = storeState.image.data

    let stateJsonString = JSON.stringify(this.getStateToSave())
    let stateBytes = new TextEncoder().encode(stateJsonString)
    let imageBytes = imageData ? imageData : new Uint8Array(0)

    let header = new Uint8Array(16)
    let view = new DataView(header.buffer)
    // Write 'fspy' magic bytes
    for (let i = 0; i < 4; i++) {
      header[i] = this.PROJECT_FILE_ID.charCodeAt(i)
    }
    view.setUint32(4, this.PROJECT_FILE_VERSION, true)
    view.setUint32(8, stateBytes.length, true)
    view.setUint32(12, imageBytes.length, true)

    let out = new Uint8Array(16 + stateBytes.length + imageBytes.length)
    out.set(header, 0)
    out.set(stateBytes, 16)
    out.set(imageBytes, 16 + stateBytes.length)
    return out
  }

  static saveAndDownload(filename: string, dispatch: Dispatch<AppAction>) {
    if (!filename.endsWith('.' + this.PROJECT_FILE_EXTENSION)) {
      filename += '.' + this.PROJECT_FILE_EXTENSION
    }
    let data = this.buildFileBuffer()
    triggerDownload(data, filename, 'application/octet-stream')
    dispatch(setProjectFilePath(filename))
  }

  static async loadExample(dispatch: Dispatch<AppAction>) {
    try {
      let response = await fetch(this.EXAMPLE_PROJECT_URL)
      if (!response.ok) {
        alert('Failed to load example project')
        return
      }
      let arrayBuffer = await response.arrayBuffer()
      this.loadFromBuffer(new Uint8Array(arrayBuffer), dispatch, true)
    } catch (_) {
      alert('Failed to load example project')
    }
  }

  static isProjectFileBuffer(buffer: Uint8Array): boolean {
    if (buffer.length < 4) {
      return false
    }
    for (let i = 0; i < 4; i++) {
      if (buffer[i] !== this.PROJECT_FILE_ID.charCodeAt(i)) {
        return false
      }
    }
    return true
  }

  static loadFromBuffer(buffer: Uint8Array, dispatch: Dispatch<AppAction>, isExampleProject: boolean, filename?: string) {
    if (!this.isProjectFileBuffer(buffer)) {
      alert('Failed to load project: this does not appear to be a valid project file')
      return
    }

    let view = new DataView(buffer.buffer, buffer.byteOffset)
    let headerSize = 16
    let projectFileVersion = view.getUint32(4, true)

    if (projectFileVersion !== this.PROJECT_FILE_VERSION) {
      alert('Failed to load project: version ' + projectFileVersion + ' project files are not compatible with this version of fSpy.')
      return
    }

    let stateStringSize = view.getUint32(8, true)
    let imageBufferSize = view.getUint32(12, true)

    let stateStringBytes = buffer.subarray(headerSize, headerSize + stateStringSize)
    let stateString = new TextDecoder().decode(stateStringBytes)

    let imageBuffer: Uint8Array | null = null
    if (imageBufferSize > 0) {
      imageBuffer = buffer.subarray(headerSize + stateStringSize)
    }

    let loadedState: SavedState = JSON.parse(stateString)
    if (loadedState.cameraParameters === undefined) {
      loadedState.cameraParameters = null
    }
    if (loadedState.resultDisplaySettings === undefined) {
      loadedState.resultDisplaySettings = defaultResultDisplaySettings
    }

    // Earlier versions had yards as a reference distance unit. Switch to feet
    // if that's the case
    const distanceUnitString = loadedState.calibrationSettingsBase.referenceDistanceUnit.toString()
    if (distanceUnitString === 'Yards') {
      loadedState.calibrationSettingsBase.referenceDistanceUnit = ReferenceDistanceUnit.Feet
      loadedState.calibrationSettingsBase.referenceDistance *= 3.0 // 3 feet per yard
    }

    // Make sure the stored camera preset still exists. If not, fall back to custom camera preset
    const cameraPresetId = loadedState.calibrationSettingsBase.cameraData.presetId
    if (cameraPresetId) {
      if (cameraPresets[cameraPresetId] === undefined) {
        loadedState.calibrationSettingsBase.cameraData.presetId = null
      }
    }

    // Fix old files not storing camera preset data
    if (loadedState.calibrationSettingsBase.cameraData.presetData === undefined) {
      loadedState.calibrationSettingsBase.cameraData.presetData = null
      const presetId = loadedState.calibrationSettingsBase.cameraData.presetId
      if (presetId) {
        const preset = cameraPresets[presetId]
        if (preset) {
          loadedState.calibrationSettingsBase.cameraData.presetData = preset
        }
      }
    }

    const projectFilePath = filename || 'project.fspy'

    if (imageBuffer) {
      loadImage(
        imageBuffer,
        (width: number, height: number, url: string) => {
          dispatch(
            loadState(
              loadedState,
              {
                width: width,
                height: height,
                data: imageBuffer,
                url: url
              },
              projectFilePath,
              isExampleProject
            )
          )
        },
        () => {
          alert('Failed to load image data contained in the project file')
        }
      )
    } else {
      dispatch(
        loadState(
          loadedState,
          {
            width: null,
            height: null,
            data: null,
            url: null
          },
          projectFilePath,
          isExampleProject
        )
      )
    }
  }
}
