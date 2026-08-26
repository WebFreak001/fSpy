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

import * as React from 'react'
import ControlPointsContainer from './containers/control-points-container'
import ResultContainer from './containers/result-container'
import SettingsContainer from './containers/settings-container'
import ToolbarContainer from './containers/toolbar-container'

import { StoreState } from './types/store-state'
import { connect } from 'react-redux'
import { AppAction, setImage } from './actions'
import { GlobalSettings } from './types/global-settings'
import { UIState } from './types/ui-state'
import { ImageState } from './types/image-state'
import { SolverResult } from './solver/solver-result'
import ProjectFile from './io/project-file'
import { loadImage } from './io/util'
import SplashScreen from './components/splash-screen'
import { Dispatch } from 'redux'

interface AppProps {
  uiState: UIState,
  globalSettings: GlobalSettings,
  solverResult: SolverResult,
  image: ImageState,
  onImageFileDropped(file: File): any
  onProjectFileDropped(file: File): any
  onOpenExampleProjectPressed(): any
}

class App extends React.PureComponent<AppProps> {

  constructor(props: AppProps) {
    super(props)
  }

  componentWillMount() {
    document.ondragover = (ev) => {
      ev.preventDefault()
      return false
    }

    document.ondragenter = (ev) => {
      ev.preventDefault()
      return false
    }

    document.ondragleave = (ev) => {
      ev.preventDefault()
      return false
    }

    document.ondrop = (ev) => {
      if (ev.dataTransfer != null) {
        let firstFile = ev.dataTransfer.files[0]
        if (firstFile) {
          if (firstFile.name.endsWith('.fspy')) {
            this.props.onProjectFileDropped(firstFile)
          } else {
            this.props.onImageFileDropped(firstFile)
          }
        }
        ev.preventDefault()
        return false
      }
      return true
    }
  }

  render() {
    const hasImage = this.props.image.data !== null
    return (
      <div id='app-wrapper'>
        <ToolbarContainer />
        <div id='app-container'>
          <SettingsContainer isVisible={this.props.uiState.sidePanelsAreVisible} />
          <ControlPointsContainer />
          <ResultContainer isVisible={this.props.uiState.sidePanelsAreVisible} />
          { !hasImage ? (<SplashScreen onClickedLoadExampleProject={this.props.onOpenExampleProjectPressed} />) : null }
        </div>
      </div>
    )
  }
}

export function mapStateToProps(state: StoreState) {
  return {
    uiState: state.uiState,
    globalSettings: state.globalSettings,
    solverResult: state.solverResult,
    image: state.image
  }
}

function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(new Uint8Array(e.target!.result as ArrayBuffer))
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export function mapDispatchToProps(dispatch: Dispatch<AppAction>) {
  return {
    onImageFileDropped: async (file: File) => {
      const data = await readFileAsUint8Array(file)
      loadImage(
        data,
        (width: number, height: number, url: string) => {
          dispatch(setImage(url, data, width, height))
        },
        () => {
          alert('Failed to load image data. Is this a valid image file?')
        }
      )
    },
    onProjectFileDropped: async (file: File) => {
      const data = await readFileAsUint8Array(file)
      ProjectFile.loadFromBuffer(data, dispatch, false, file.name)
    },
    onOpenExampleProjectPressed: () => {
      ProjectFile.loadExample(dispatch)
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(App as any)
