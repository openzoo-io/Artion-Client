import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from 'react-router-dom';

import { Toaster } from 'react-hot-toast';
import { ethers } from 'ethers';
import { useWeb3React } from '@web3-react/core';
// import { ChainId } from '@sushiswap/sdk';
// import { Client } from '@bandprotocol/bandchain.js';
import ProtectedRoute from './ProtectedRoute';
import AccountModal from './AccountModal';
import WFTMModal from './WFTMModal';
import NotFound from './NotFound';
import PaintBoard from './PaintBoard';
//import ExplorePage from '../pages/explorepage';
//import AccountDetails from '../pages/AccountDetails';
//import NFTItem from '../pages/NFTItem';
import CollectionCreate from '../pages/Collection/Create';
import CollectionReview from '../pages/Collection/Review';
import NotificationSetting from '../pages/NotificationSetting';
import PriceActions from 'actions/price.actions';
//import { HomePage } from 'pages/HomePage/HomePage';
//import { NewExplorePage } from 'pages/NewExplorePage';
//import { ArtworkDetailPage } from 'pages/ArtworkDetailPage';
//import { AccountProfilePage } from 'pages/AccountProfilePage';
//import { CollectionsPage } from 'pages/CollectionsPage';
//import { CollectionList } from 'pages/CollectionList';
import axios from 'axios';
import CoinGeckoActions from 'actions/coinGecko.actions';

const HomePage = React.lazy(() => import('../pages/HomePage/HomePage'));
const NewExplorePage = React.lazy(() => import('../pages/NewExplorePage/NewExplorePage'));
const ArtworkDetailPage = React.lazy(() => import('../pages/ArtworkDetailPage/ArtworkDetailPage'));
const CollectionList = React.lazy(() => import('../pages/CollectionList/CollectionList'));
const CollectionsPage = React.lazy(() => import('../pages/CollectionsPage/CollectionsPage'));
const AccountProfilePage = React.lazy(() => import('../pages/AccountProfilePage/AccountProfilePage'));
//console.log('homepage', HomePage)

const App = () => {
  const dispatch = useDispatch();
  const { chainId, connector } = useWeb3React();

  useEffect(() => {

    //alert('OpenZoo is on maintenance mode. Please do not use it for now. We will be back soon. Thank you for your patience.');
    const fetch = () => {
      axios
        .get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=zookeeper&order=market_cap_desc&per_page=100&page=1&sparkline=false')
        .then(response => {
          if (response?.data?.[0])
            dispatch(CoinGeckoActions.dataFetched(response.data[0]))
        })
    }

    fetch();
    setInterval(fetch, 60000);
  }, []);

  useEffect(() => {
    const getPrice = async () => {
      try {
        if (chainId === 888) {
          const web3provider = await connector.getProvider();
          //await web3provider.enable();
          const provider = new ethers.providers.Web3Provider(web3provider);
          const oracle = new ethers.Contract(
            '0xA34D0a3a38C385B8CAbF1d888c61ca0d2500B7cE',
            [
              {
                inputs: [{ internalType: 'address', type: 'address', name: '_token' }],
                name: 'getPrice',
                outputs: [{ internalType: 'int256', name: '', type: 'int256' }],
                stateMutability: 'view',
                type: 'function',
              },
            ],
            provider
          );
          const ZOO = '0x6e11655d6aB3781C6613db8CB1Bc3deE9a7e111F';
          const _price = await oracle.getPrice(ZOO);
          const price = parseFloat(_price.toString()) / 10 ** 18;
          dispatch(PriceActions.updatePrice(price));
        } else if (chainId === 999) {
          const web3provider = await connector.getProvider();
          //await web3provider.enable();
          const provider = new ethers.providers.Web3Provider(web3provider);
          const oracle = new ethers.Contract(
            '0x2f5e32eC8d9A298063F7FFA14aF515Fa8fEb71Eb',
            [
              {
                inputs: [{ internalType: 'address', type: 'address', name: '_token' }],
                name: 'getPrice',
                outputs: [{ internalType: 'int256', name: '', type: 'int256' }],
                stateMutability: 'view',
                type: 'function',
              },
            ],
            provider
          );
          const ZOO = '0x890589dC8BD3F973dcAFcB02b6e1A133A76C8135';
          const _price = await oracle.getPrice(ZOO);
          const price = parseFloat(_price.toString()) / 10 ** 18;
          dispatch(PriceActions.updatePrice(price));
        }
      } catch (err) {
        console.log(err);
      }
    };

    getPrice();
    const timer = setInterval(getPrice, 1000 * 10);
    return () => {
      clearInterval(timer);
    }
  }, [chainId]);


  return (
    <div>
      <Router history={history}>
        <React.Suspense fallback={<div>Page Loading...</div>}>
          <Switch>

            <Route exact path="/" component={HomePage} />
            <Route exact path="/home" component={HomePage} />
            {/*
          <Route exact path="/old-explore" component={ExplorePage} />
          <Route path="/old-explore/:addr/:id" component={NFTItem} />
           */}
            <Route exact path="/explore" component={NewExplorePage} />
            <Route exact path="/explore/:addr" component={NewExplorePage} />
            <Route exact path="/collection/:addr/:id" component={ArtworkDetailPage} />
            <Route exact path="/collection/:addr" component={CollectionList} />
            <ProtectedRoute exact path="/create" component={PaintBoard} />
            {/* <Route path="/bundle/:bundleID" component={NFTItem} /> */}
            <Route path="/account/:uid" component={AccountProfilePage} />
            {/* <Route path="/old-account/:uid" component={AccountDetails} /> */}
            <Route path="/collections" component={CollectionsPage} />



            <ProtectedRoute
              path="/collection/create"
              component={() => <CollectionCreate isRegister={false} />}
            />
            <ProtectedRoute
              path="/collection/register"
              component={() => <CollectionCreate isRegister />}
            />
            <ProtectedRoute
              path="/collection/review"
              component={CollectionReview}
            />
            <ProtectedRoute
              path="/settings/notification"
              component={NotificationSetting}
            />

            

            <Route path="/404" component={NotFound} />
            <Route path="*">
              <Redirect to="/404" />
            </Route>
          </Switch>
        </React.Suspense>
        <AccountModal />
        <WFTMModal />
        <Toaster position="bottom-right" reverseOrder={false} />
      </Router>
    </div >
  );
};

export default App;
