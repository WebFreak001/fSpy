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

export interface ToolbarProps {
  hasImage: boolean
  hasProject: boolean
  hasUnsavedChanges: boolean
  projectFilename: string | null
  onNewProject(): void
  onOpenProject(): void
  onOpenImage(): void
  onSaveProject(): void
  onSaveProjectAs(): void
  onExportJSON(): void
  onExportImage(): void
  onToggleSidePanels(): void
}

const buttonStyle: React.CSSProperties = {
  height: '100%',
  padding: '0 10px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: '12px',
  color: '#333',
  outline: 'none'
}

const separatorStyle: React.CSSProperties = {
  width: '1px',
  backgroundColor: '#ccc',
  margin: '4px 2px',
  alignSelf: 'stretch'
}

export default class Toolbar extends React.PureComponent<ToolbarProps> {
  render() {
    const { hasImage, hasUnsavedChanges, projectFilename, hasProject } = this.props

    const titleText = projectFilename
      ? (hasUnsavedChanges ? `${projectFilename} •` : projectFilename)
      : (hasUnsavedChanges ? 'Untitled •' : '')

    return (
      <div id='toolbar'>
        <button style={buttonStyle} onClick={this.props.onNewProject} title='New project'>New</button>
        <button style={buttonStyle} onClick={this.props.onOpenProject} title='Open project file'>Open Project</button>
        <button style={buttonStyle} onClick={this.props.onOpenImage} title='Open image file'>Open Image</button>
        <div style={separatorStyle} />
        <button
          style={{ ...buttonStyle, opacity: hasProject ? 1 : 0.4 }}
          onClick={this.props.onSaveProject}
          disabled={!hasProject}
          title='Save project'
        >
          Save
        </button>
        <button
          style={{ ...buttonStyle, opacity: hasProject ? 1 : 0.4 }}
          onClick={this.props.onSaveProjectAs}
          disabled={!hasProject}
          title='Save project as...'
        >
          Save As
        </button>
        <div style={separatorStyle} />
        <button
          style={{ ...buttonStyle, opacity: hasImage ? 1 : 0.4 }}
          onClick={this.props.onExportJSON}
          disabled={!hasImage}
          title='Export camera parameters as JSON'
        >
          Export JSON
        </button>
        <button
          style={{ ...buttonStyle, opacity: hasImage ? 1 : 0.4 }}
          onClick={this.props.onExportImage}
          disabled={!hasImage}
          title='Export project image'
        >
          Export Image
        </button>
        <div style={separatorStyle} />
        <button style={buttonStyle} onClick={this.props.onToggleSidePanels} title='Toggle side panels'>Panels</button>
        { titleText ? <span style={{ marginLeft: '10px', color: '#666', fontSize: '12px', alignSelf: 'center' }}>{titleText}</span> : null }
      </div>
    )
  }
}
