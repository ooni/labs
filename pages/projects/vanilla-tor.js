import { range, sortBy, round } from "lodash"
import React from 'react'
import NLink from 'next/link'
import Head from 'next/head'
import moment from 'moment'

import styled from 'styled-components'

import WeatherCloudySvg from '../../svgs/weather-cloudy.svg'
import WeatherRainySvg from '../../svgs/weather-rainy.svg'
import WeatherSunnySvg from '../../svgs/weather-sunny.svg'

//weather-cloudy.svg          weather-rainy.svg
//weather-lightning-rainy.svg weather-sunny.svg
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
  Text,
  colors,
  Hero,
  HeroLead,
} from 'ooni-components'

const BrandContainer = styled.div`
  max-width: 100%;
  svg {
    max-width: 100%;
  }
`
import victoryTheme from 'ooni-components/dist/theme/victoryTheme'

import {
  Table,
  TableBody,
  TableHeader,
  TableHeaderColumn,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table'

import DataTables from 'material-ui-datatables'

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
    </Flex>
  )
}

const ScatterChart = ({selectedCountries, selectedData}) => {
  const dataFilter = (d) => {
    if (d.y > 320 || d.y < 0) {
      return false
    }
    return true
  }
  return (
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

    <VictoryLegend x={125} y={50}
        orientation="horizontal"
      data={selectedCountries.map(d => {
        const name = countries.getName(d.toUpperCase()) || 'Unknown'
        return {
          name: name,
          symbol: {
            fill: getColor(selectedCountries, d)
          }
        }
      })}/>

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
  )
}

class CountryTable extends React.Component {

  constructor(props, context) {
    super(props, context)

    const {
      selectedCountries,
      statsByCountry,
      onRowSelection
    } = props

    let selectedRows = []
    const data = statsByCountry.map((d, idx) => {
      const stats = d.values[0]
      if (selectedCountries.indexOf(stats.country) !== -1) {
        selectedRows.push(idx)
      }
      return {
        countryName: stats.countryName,
        country: stats.country,
        runtimeMin: round(stats.runtimeMin, 2),
        runtimeAvg: round(stats.runtimeAvg, 2),
        runtimeMax: round(stats.runtimeMax, 2),
        successCount: stats.successCount,
        failureCount: stats.failureCount,
        successRate: round(stats.successCount/(stats.failureCount+stats.successCount) * 100, 1),
        asnCount: stats.asnCount,
      }
    })

    this.state = {
      data: data,
      selectedRows: selectedRows
    }

    this.handleSortOrderChange = this.handleSortOrderChange.bind(this)
    this.handleRowSelection = this.handleRowSelection.bind(this)
  }

  handleRowSelection(rows) {
    const newRow = rows.filter(row => this.state.selectedRows.indexOf(row) === -1)[0]
    let selectedRows = this.state.selectedRows.slice() || []
    if (this.state.selectedRows.length > 2) {
      selectedRows = selectedRows.slice(-2)
    }
    selectedRows.push(newRow)
    this.setState({
      selectedRows
    })
    const selectedCountries = this.state.data
      .filter((_, idx) => selectedRows.indexOf(idx) !== -1)
      .map(d => d.country)
    this.props.onRowSelection(selectedCountries)
  }

  handleSortOrderChange(key, order) {
    let newData = sortBy(this.state.data, key)
    if (order === 'asc') {
      newData = newData.reverse()
    }
    this.setState({
      data: newData
    })
  }

  render() {
    const {
      selectedCountries,
      statsByCountry,
      onRowSelection
    } = this.props

    const {
      data,
      selectedRows
    } = this.state

    const columns = [
      {
        key: 'countryName',
        sortable: true,
        label: 'Country',
        style: {
          width: '150px'
        },
        render: (name, all) => {
          if (name.length > 22) {
            name = name.substring(0, 20)
            name += '…'
          }
          return name
        }
      },
      {
        key: 'asnCount',
        sortable: true,
        label: 'ASNs',
      },
      {
        key: 'runtimeAvg',
        sortable: true,
        label: 'avg (ms)',
      },
      {
        key: 'runtimeMin',
        sortable: true,
        label: 'max (ms)',
      },
      {
        key: 'runtimeMax',
        sortable: true,
        label: 'min (ms)',
      },
      {
        key: 'successCount',
        sortable: true,
        label: 'Successes',
      },
      {
        key: 'failureCount',
        sortable: true,
        label: 'Failures',
      },
      {
        key: 'successRate',
        sortable: true,
        label: 'Score',
      }
    ]

    return (
      <DataTables
          height={'300px'}
          multiSelectable={true}
          selectable={true}
          showRowHover={true}
          selectedRows={selectedRows}
          columns={columns}
          data={data}
          showCheckboxes={true}
          showFooterToolbar={false}
          onRowSelection={this.handleRowSelection}
          onSortOrderChange={this.handleSortOrderChange}
        />
    )

  }
}

const WeatherIcon = ({percentage}) => {
  if (percentage > 98) {
    return <WeatherSunnySvg />
  } else if (percentage < 50) {
    return <WeatherRainySvg />
  }
  return <WeatherCloudySvg />
}

const Stat = styled.div`
  font-size: 30px;
`

const StatSymbol = styled.div`
  font-size: 12px;
  padding-left: 5px;
  display: inline-block;
`

const WeatherBox = ({stats}) => {
  return (
    <Flex wrap>
      <Box w={1/3} pr={2}>
        <WeatherIcon percentage={stats.percentage} />
      </Box>
      <Box w={2/3}>
        <Heading>{stats.countryName}</Heading>
        <Flex wrap>
          <Box w={1/2}>
          <Stat>{round(stats.percentage, 1)}<StatSymbol>%</StatSymbol></Stat>
          <Stat>{round(stats.runtimeAvg, 1)}<StatSymbol>s</StatSymbol></Stat>
          </Box>
          <Box w={1/2}>
          <Stat>{stats.asnCount}<StatSymbol>ASN{stats.asnCount > 1 ? 's' : ''}</StatSymbol></Stat>
          </Box>
        </Flex>
      </Box>
    </Flex>
  )
}

const WeatherTable = ({selectedCountries, keyedStatsByCountry}) => {
  return (
    <Flex wrap>
      {selectedCountries.map(key => (
      <Box w={1/3} key={key}>
        <WeatherBox stats={keyedStatsByCountry[key]} />
      </Box>
      ))}
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
    const keyedStatsByCountry = {}
    const data = d3Dsv.csvParse(res.data, (d) => {
      let stats = {
        country: d.probe_cc,
        countryName: getCountryName(d.probe_cc),
        asn: +d.probe_asn,
        asnCount: +d.probe_asn_count,
        successCount: +d.success_count,
        failureCount: +d.failure_count,
        runtimeAvg: +d.test_runtime_avg,
        runtimeMin: +d.test_runtime_min,
        runtimeMax: +d.test_runtime_max
      }
      stats['percentage'] = round(stats.successCount/(stats.failureCount+stats.successCount), 3) * 100
      keyedStatsByCountry[d.probe_cc] = stats
      return stats
    })
    let statsByCountry = sortBy(d3Collection.nest()
      .key(d => d.country)
      .entries(data), x => x.values[0].countryName)

    return {
      statsByCountry,
      keyedStatsByCountry
    }
  }

  handleChecked(selectedCountries) {
    this.setState({
      selectedCountries
    })
    const promises = selectedCountries.map(cc => {
      const msmt_url = `/data/vanilla-tor/by-country/${cc}.csv`
      return axios.get(msmt_url)
    })
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
        const dataByCountry = d3Collection.nest()
          .key(d => d.country)
          .entries(data)
        this.setState({
          dataByCountry
        })
        dataByCountry
      }).bind(this))
  }

  render () {
    const {
      statsByCountry,
      keyedStatsByCountry
    } = this.props

    const {
      dataByCountry,
      selectedCountries
    } = this.state

    const selectedData = dataByCountry
      .filter(d => selectedCountries.indexOf(d.key) !== -1)
      .reduce((a, b) => a.concat(b.values), [])

    return (
      <Layout>
        <Head>
          <title>Bar chart</title>
        </Head>

        <Hero pb={4} pt={4}>
          <BrandContainer>
            <Heading h={1}>Vanilla Tor</Heading>
          </BrandContainer>
          <HeroLead>
          What is the Tor weather like around the world
        </HeroLead>
        </Hero>

        <Container pt={4}>

          {selectedCountries.length == 0
          && <Heading h={2}>Pick a country to get started!</Heading>}

          {selectedCountries.length > 0
          && <WeatherTable
              selectedCountries={selectedCountries}
              keyedStatsByCountry={keyedStatsByCountry}
              />
          }

          <CountryTable
            selectedCountries={selectedCountries}
            statsByCountry={statsByCountry}
            onRowSelection={this.handleChecked}
          />

          {selectedCountries.length > 0
          && <div>

             <Stats stats={statsByCountry} selectedCountries={selectedCountries} />
             <ScatterChart selectedCountries={selectedCountries} selectedData={selectedData}/>
          </div>}

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
