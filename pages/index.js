import React from 'react'

import {
  Heading,
  Hero,
  HeroLead,
  LogoOONIRun,
  Link,
  Container
} from 'ooni-components'

import Layout from '../components/layout'

import styled from 'styled-components'
const BrandContainer = styled.div`
  max-width: 100%;
  svg {
    max-width: 100%;
  }
`
export default props => {
  return (
    <Layout>
    <Hero pb={4} pt={4}>
      <BrandContainer>
        <Heading h={1}>OONI Labs</Heading>
      </BrandContainer>
      <HeroLead>
      Where the experimentation begins
    </HeroLead>
    </Hero>
    <Container>
    <Heading h={2}>Projects</Heading>
    <ul>
    <li><Link href='/projects/vanilla-tor'>Vanilla Tor analysis</Link></li>
    </ul>
    </Container>
    </Layout>
  )
}
