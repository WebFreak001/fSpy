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

import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { AppAction, setImage, loadDefaultState, setSidePanelVisibility } from '../actions'
import Toolbar from '../components/toolbar/toolbar'
import { StoreState } from '../types/store-state'
import ProjectFile from '../io/project-file'
import { loadImage, triggerDownload } from '../io/util'
import store from '../store/store'

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      resolve(input.files ? input.files[0] : null)
    }
    input.click()
  })
}

function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(new Uint8Array(e.target!.result as ArrayBuffer))
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function mapStateToProps(state: StoreState) {
  const filename = state.uiState.projectFilePath
    ? state.uiState.projectFilePath.split('/').pop()!
    : null
  return {
    hasImage: state.image.data !== null,
    hasProject: state.image.data !== null || state.uiState.projectFilePath !== null,
    hasUnsavedChanges: state.uiState.projectHasUnsavedChanges,
    projectFilename: filename
  }
}

function mapDispatchToProps(dispatch: Dispatch<AppAction>) {
  return {
    onNewProject: () => {
      const state = store.getState()
      if (state.uiState.projectHasUnsavedChanges) {
        if (!window.confirm('Discard unsaved changes?')) {
          return
        }
      }
      dispatch(loadDefaultState())
    },

    onOpenProject: () => {
      pickFile('.fspy').then((file) => {
        if (!file) { return }
        readFileAsUint8Array(file).then((data) => {
          ProjectFile.loadFromBuffer(data, dispatch, false, file.name)
        })
      })
    },

    onOpenImage: () => {
      pickFile('image/*').then((file) => {
        if (!file) { return }
        readFileAsUint8Array(file).then((data) => {
          loadImage(
            data,
            (width, height, url) => dispatch(setImage(url, data, width, height)),
            () => alert('Failed to load image. Is this a valid image file?')
          )
        })
      })
    },

    onSaveProject: () => {
      const state = store.getState()
      const filename = state.uiState.projectFilePath || 'project.fspy'
      ProjectFile.saveAndDownload(filename, dispatch)
    },

    onSaveProjectAs: () => {
      const state = store.getState()
      const suggested = state.uiState.projectFilePath || 'project'
      const base = suggested.replace(/\.fspy$/, '')
      const name = window.prompt('Save project as:', base)
      if (name === null) { return }
      ProjectFile.saveAndDownload(name || 'project', dispatch)
    },

    onExportJSON: () => {
      const state = store.getState()
      const cameraParameters = state.solverResult.cameraParameters
      if (!cameraParameters) { return }
      const json = JSON.stringify(cameraParameters, null, 2)
      triggerDownload(json, 'camera-parameters.json', 'application/json')
    },

    onExportImage: () => {
      const state = store.getState()
      const imageData = state.image.data
      if (!imageData) { return }
      triggerDownload(imageData, 'image.png', 'image/png')
    },

    onToggleSidePanels: () => {
      const state = store.getState()
      dispatch(setSidePanelVisibility(!state.uiState.sidePanelsAreVisible))
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Toolbar as any)
