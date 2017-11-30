import React from 'react'

import Header from './header'

import { injectGlobal } from 'styled-components'

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'

import {
  Provider,
  theme
} from 'ooni-components'


injectGlobal`
  * {
    text-rendering: geometricPrecision;
    box-sizing: border-box;
  }
  body, html {
    margin: 0;
    padding: 0;
    font-family: "Fira Sans";
    height: 100%;
  }`

export default class extends React.Component {

  static propTypes = {
    children: React.PropTypes.array.isRequired,
  }

  render () {
    return (
      <div>
        <MuiThemeProvider>
        <Provider theme={theme}>
          <Header />
          <div className="content">
            { this.props.children }
          </div>
        </Provider>
        </MuiThemeProvider>
      </div>
    )
  }
}
