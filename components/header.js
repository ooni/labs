import React from 'react'

import Link from 'next/link'
import Head from 'next/head'

import { Flex, Box } from 'rebass'

import colors from '../themes/colors'

export default class extends React.Component {
  render() {
    return (
      <header>
        <Head>
          <meta charset='utf-8'/>
          <meta name='viewport' content='initial-scale=1.0, width=device-width'/>
        </Head>
        <div className='headerNav'>
          <Flex align="center">
            <Box p={2} w={1/2} justify='space-around'>
              <div className="ooni-logo">
                <Link href="/">
                <a><img height="45px" src="/_/static/ooni-logo.svg" /></a>
                </Link>
              </div>
            </Box>
          </Flex>
        </div>
        <style jsx>{`
          .headerNav {
            background-color: ${ colors.BLUE_GREY };
          }
        `}</style>
      </header>
    )
  }
}
