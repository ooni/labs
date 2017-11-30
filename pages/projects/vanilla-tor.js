import { range, sortBy, round } from "lodash"
import React from 'react'
import NLink from 'next/link'
import Head from 'next/head'
import moment from 'moment'

import Promise from 'bluebird'

import NoSSR from 'react-no-ssr'

import * as d3Dsv from 'd3-dsv'
import * as d3Collection from 'd3-collection'

import axios from 'axios'
import { Flex, Box, Grid } from 'rebass'

import SelectField from 'material-ui/SelectField'
import MenuItem from 'material-ui/MenuItem'

import {
  Container,
  Link,
  Input,
  Label,
  Checkbox,
  Textarea,
  Button,
  Heading,
  colors
} from 'ooni-components'

import victoryTheme from 'ooni-components/dist/theme/victoryTheme'

import {
  Table,
  TableBody,
  TableHeader,
  TableHeaderColumn,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table';


import Layout from '../../components/layout'

import {
  VictoryChart,
  VictoryGroup,
  VictoryScatter,
  VictoryAxis,
  VictoryTooltip,
  VictoryLabel,
  VictoryLegend,
  VictoryBar,
  VictoryVoronoiContainer,
  VictoryContainer,
  VictoryCandlestick
} from 'victory'

const countries = require('country-list')()

const paletteSuccess = [
  colors.palette.blue4,
  colors.palette.violet6,
  colors.palette.cyan3
]
const paletteFail = [
  colors.palette.yellow2,
  colors.palette.red5,
  colors.palette.orange4
]

const getCountryName = (iso2) => {
  let name = countries.getName(iso2.toUpperCase()) || 'Unknown'
  return name.split(',')[0]
}

const getColor = (selectedCountries, country, success=true) => {
  const idx = (selectedCountries.indexOf(country) % (paletteFail.length + 1))
  return success ? paletteSuccess[idx] : paletteFail[idx]
}

const Stats = ({selectedCountries, stats}) => {
  let selectedData = stats
      .filter(d => selectedCountries.indexOf(d.key) !== -1)
      .reduce((p, c) => { p[c.key] = c.values; return p}, {})

  // This is done to enforce sorting by selected country name
  selectedData = selectedCountries.reduce((p, c) => p.concat(selectedData[c]), [])

  return (
    <Flex wrap>
      <Box w={1}>
      <Table selectable={false}>
      <TableHeader>
        <TableRow>
          <TableHeaderColumn>Country</TableHeaderColumn>
          <TableHeaderColumn>Bootstrap (min,avg,max)</TableHeaderColumn>
          <TableHeaderColumn>Successes</TableHeaderColumn>
          <TableHeaderColumn>Failures</TableHeaderColumn>
          <TableHeaderColumn>Percentage</TableHeaderColumn>
        </TableRow>
      </TableHeader>
      <TableBody>
        {selectedCountries.map(cc => {
          const stats = selectedData.filter(d => d.country == cc)[0]
          return (
            <TableRow>
              <TableRowColumn>{stats.country}</TableRowColumn>
              <TableRowColumn>{round(stats.runtimeMin, 2)},{round(stats.runtimeAvg, 2)},{round(stats.runtimeMax, 2)}</TableRowColumn>
              <TableRowColumn>{stats.successCount}</TableRowColumn>
              <TableRowColumn>{stats.failureCount}</TableRowColumn>
              <TableRowColumn>{round(stats.successCount/(stats.failureCount+stats.successCount), 3)}</TableRowColumn>
            </TableRow>
          )
        })}
      </TableBody>
      </Table>
      </Box>
      <Box w={1/2}>
        <VictoryChart
          domainPadding={{y: 10, x: 40}}
          height={400} width={400}>
          <VictoryLabel text="Success/Failure" x={225} y={30} textAnchor="middle"/>
          <VictoryGroup offset={20} style={{ data: { width: 15 } }}>
            <VictoryBar
              labels={(d) => `${d.successCount}`}
              style={{
                  data: {
                    fill: d => getColor(selectedCountries, d.country, true)
                  }
              }}
              y='successCount'
              x='country'
              data={selectedData} />
            <VictoryBar
              labels={(d) => `${d.failureCount}`}
              style={{
                  data: {
                    fill: d => getColor(selectedCountries, d.country, false)
                  }
              }}
              y='failureCount'
              x='country'
              data={selectedData} />
          </VictoryGroup>
          <VictoryAxis tickValues={selectedCountries} />
          <VictoryAxis dependentAxis />
        </VictoryChart>
      </Box>

      <Box w={1/2}>
        <VictoryChart
          domainPadding={{y: 10, x: 40}}
          height={400} width={400}>

          <VictoryLabel text="Bootstrap time" x={225} y={30} textAnchor="middle"/>

          <VictoryCandlestick
            style={{
                data: {
                  fill: d => getColor(selectedCountries, d.country, true)
                }
            }}
            open={d => (Math.max(d.runtimeAvg - 10, 0))}
            close='runtimeAvg'
            high='runtimeMax'
            low='runtimeMin'
            x='country'
            data={selectedData} />
        </VictoryChart>
      </Box>
      <Box w={1/2}>
        <VictoryChart
          domainPadding={{y: 10, x: 40}}
          height={400} width={400}>
          <VictoryLabel text="ASNs" x={225} y={30} textAnchor="middle"/>
          <VictoryBar
            style={{
                data: {
                  fill: d => getColor(selectedCountries, d.country, true)
                }
            }}
            y='asnCount'
            x='country'
            data={selectedData} />
        </VictoryChart>
      </Box>
    </Flex>
  )
}

export default class extends React.Component {
  constructor() {
    super()
    this.state = {
      selectedCountries: [],
      dataByCountry: []
    }
    this.handleChecked = this.handleChecked.bind(this)
  }

  static async getInitialProps({req}) {
    let prefix = ''
    if (req) {
      prefix = 'http://127.0.0.1:3100'
    }
    const stat_url = '/data/vanilla-tor/20171130-vanilla_tor-stats.csv'

    const res = await axios.get(prefix + stat_url)
    const data = d3Dsv.csvParse(res.data, (d) => {
      return {
        country: d.probe_cc,
        asn: +d.probe_asn,
        asnCount: +d.probe_asn_count,
        successCount: +d.success_count,
        failureCount: +d.failure_count,
        runtimeAvg: +d.test_runtime_avg,
        runtimeMin: +d.test_runtime_min,
        runtimeMax: +d.test_runtime_max
      }
    })
    const statsByCountry = d3Collection.nest()
      .key(d => d.country)
      .entries(data)

    const availableCountries = sortBy(statsByCountry
      .map(d => ({
        'iso2': d.key,
        name: getCountryName(d.key)
      })), x => x.name)

    return {
      availableCountries,
      statsByCountry
    }
  }

  handleChecked(event, index, values) {
    const selectedCountries = values.slice(-3)
    const promises = selectedCountries.map(cc => {
      const msmt_url = `/data/vanilla-tor/by-country/${cc}.csv`
      return axios.get(msmt_url)
    })
    console.log(this.setState)
    Promise.all(promises)
      .then((results => {
        let data = results.reduce((p, n)=> {
          return p.concat(d3Dsv.csvParse(n.data, (d) => {
            return {
              country: d.probe_cc,
              asn: +d.probe_asn,
              y: +d.test_runtime,
              success: true ? d.tor_success == 'TRUE' : false,
              x: moment(d.measurement_start_time).unix() * 1000
            }
          }))
        }, [])
        console.log(data)
        const dataByCountry = d3Collection.nest()
          .key(d => d.country)
          .entries(data)
        this.setState({
          selectedCountries,
          dataByCountry
        })
      }).bind(this))
  }

  render () {
    const {
      availableCountries,
      statsByCountry
    } = this.props

    const {
      dataByCountry,
      selectedCountries
    } = this.state

    const dataFilter = (d) => {
      if (d.y > 320 || d.y < 0) {
        return false
      }
      return true
    }

    const selectedData = dataByCountry
      .filter(d => selectedCountries.indexOf(d.key) !== -1)
      .reduce((a, b) => a.concat(b.values), [])

    return (
      <Layout>
        <Head>
          <title>Bar chart</title>
        </Head>

        <Container>
          <Flex wrap>
          <NoSSR>
          <SelectField
            multiple={true}
            hintText="Pick a country"
            value={selectedCountries}
            onChange={(event, index, values) => this.handleChecked(event, index, values)}
          >
            {availableCountries.map(({name, iso2}) => (
              <MenuItem
                key={iso2}
                insetChildren={true}
                checked={selectedCountries && selectedCountries.indexOf(iso2) > -1}
                value={iso2}
                primaryText={name}
              />
            ))}
          </SelectField>
          </NoSSR>
          </Flex>

          <VictoryChart
            height={400}
            width={600}
            domainPadding={{y: 10}}
            scale={{x: "time"}}
            theme={victoryTheme}
            containerComponent={
            <VictoryVoronoiContainer
              dimension='x'
              labels={
                (d) => `${d.country} (AS${d.asn}): ${d.y} ${moment(d.x).format('YY-MM-DD')}`
              }
              labelComponent={
                <VictoryTooltip
                  cornerRadius={0}
                  flyoutStyle={{fill: "white"}}
                />}
            />}>

            {selectedCountries.length > 0
            && <VictoryLegend x={125} y={50}
                orientation="horizontal"
              data={selectedCountries.map(d => {
                const name = countries.getName(d.toUpperCase()) || 'Unknown'
                return {
                  name: name,
                  symbol: {
                    fill: getColor(selectedCountries, d)
                  }
                }
              })}/>}

            <VictoryScatter
              style={{
                data: {
                  fill: d => getColor(selectedCountries, d.country, d.success)
                }
              }}
              size={(d, active) => active ? 2 : 1}
              data={selectedData.filter(dataFilter)}
            />
            <VictoryAxis
              label="date"
              style={{
                axisLabel: { padding: 30 }
              }}
              tickFormat={x => moment(x).format('MMM \'YY')}
            />
            <VictoryAxis dependentAxis
              label="tor runtime"
              style={{
                axisLabel: { padding: 40 }
              }}
            />
          </VictoryChart>

          <Stats stats={statsByCountry} selectedCountries={selectedCountries} />
          <Heading>Download</Heading>
          <ul>
          <li><Link href='/data/vanilla-tor/20171130-vanilla_tor-measurements.csv'>
          measurements.csv</Link></li>
          <li><Link href='/data/vanilla-tor/20171130-vanilla_tor-stats.csv'>
          stats.csv</Link></li>
          </ul>
        </Container>
      </Layout>
    )
  }
}
