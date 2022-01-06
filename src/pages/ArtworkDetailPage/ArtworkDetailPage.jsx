/* eslint-disable no-unused-expressions,  no-unused-vars */
import { Footer } from 'components/Footer';
import Header from 'components/header';
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { ethers } from 'ethers';
import { useParams, Link, useHistory } from 'react-router-dom';
import {
  ArtworkDetailPageDetailSection,
  ArtworkDetailPageStateSection,
  ArtworkDetailPagePriceSection,
  ArtworkDetailPageHistorySection,
} from './components';
import { useApi } from 'api';
import useTokens from 'hooks/useTokens';
import {
  useNFTContract,
  useSalesContract,
  useAuctionContract,
  useBundleSalesContract,
  getSigner,
} from 'contracts';
import {
  shortenAddress,
  formatNumber,
  formatError,
  getRandomIPFS,
} from 'utils';
import axios from 'axios';

import { useDispatch, useSelector } from 'react-redux';
import cx from 'classnames';
import Loader from 'react-loader-spinner';
import 'react-loader-spinner/dist/loader/css/react-spinner-loader.css';
import Skeleton from 'react-loading-skeleton';
import ReactResizeDetector from 'react-resize-detector';
import { ArtworkMediaView } from 'components/ArtworkMedia';
import BootstrapTooltip from 'components/BootstrapTooltip';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import {
  LineChart,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  CartesianGrid,
  Line,
} from 'recharts';
// import { ChainId } from '@sushiswap/sdk';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useWeb3React } from '@web3-react/core';
import { ClipLoader } from 'react-spinners';
import {
  ViewModule as ViewModuleIcon,
  Gavel as GavelIcon,
  Timeline as TimelineIcon,
  LocalOffer as LocalOfferIcon,
  Toc as TocIcon,
} from '@material-ui/icons';
import toast from 'react-hot-toast';

import Panel from 'components/Panel';
import Identicon from 'components/Identicon';
import { Contracts } from 'constants/networks';
import showToast from 'utils/toast';

import TxButton from 'components/TxButton';
import TransferModal from 'components/TransferModal';
import BurnModal from 'components/BurnModal';
import SellModal from 'components/SellModal';
import OfferModal from 'components/OfferModal';
import AuctionModal from 'components/AuctionModal';
import BidModal from 'components/BidModal';
import OwnersModal from 'components/OwnersModal';
import LikesModal from 'components/LikesModal';
import SuspenseImg from 'components/SuspenseImg';
import ModalActions from 'actions/modal.actions';
import CollectionsActions from 'actions/collections.actions';
import HeaderActions from 'actions/header.actions';
import usePrevious from 'hooks/usePrevious';

import styles from './styles.module.scss';

import { AssetCard } from 'components/NFTAssetCard/AssetCard';


const ONE_MIN = 60;
const ONE_HOUR = ONE_MIN * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_MONTH = ONE_DAY * 30;

// eslint-disable-next-line no-undef
const ENV = process.env.REACT_APP_ENV;
const CHAIN = ENV === 'MAINNET' ? 888 : 999;

export function ArtworkDetailPage() {
  const dispatch = useDispatch();
  const history = useHistory();

  const {
    explorerUrl,
    storageUrl,
    apiUrl,
    getBundleDetails,
    fetchItemDetails,
    increaseBundleViewCount,
    increaseViewCount,
    getBundleOffers: _getBundleOffers,
    getBundleTradeHistory: _getBundleTradeHistory,
    getTransferHistory,
    fetchCollection,
    fetchCollections,
    getUserAccountDetails,
    get1155Info,
    getTokenHolders,
    getBundleLikes,
    isLikingItem,
    isLikingBundle,
    likeItem,
    likeBundle,
    getItemLikeUsers,
    getBundleLikeUsers,
    getItemsLiked,
    getNonce,
    retrieveUnlockableContent,
    fetchAuctionBidParticipants,
  } = useApi();
  const {
    getERC20Contract,
    getERC721Contract,
    getERC1155Contract,
  } = useNFTContract();
  const {
    getSalesContract,
    buyItemETH,
    buyItemERC20,
    buyItemERC20WithQuantity,
    cancelListing,
    listItem,
    updateListing,
    createOffer,
    cancelOffer,
    acceptOffer,
    getCollectionRoyalty,
    getNFTRoyalty,
    getPlatformFee,
  } = useSalesContract();
  const {
    getAuctionContract,
    getAuction,
    cancelAuction,
    createAuction,
    getHighestBidder,
    placeBid,
    resultAuction,
    updateAuctionStartTime,
    updateAuctionEndTime,
    updateAuctionReservePrice,
    withdrawBid,
  } = useAuctionContract();
  const {
    getBundleSalesContract,
    getBundleListing,
    buyBundleETH,
    buyBundleERC20,
    cancelBundleListing,
    listBundle,
    updateBundleListing,
    createBundleOffer,
    cancelBundleOffer,
    acceptBundleOffer,
  } = useBundleSalesContract();

  const { addr: address, id: tokenID, bundleID } = useParams();



  const { getTokenByAddress, tokens } = useTokens();

  const { account, chainId } = useWeb3React();

  const [salesContractApproved, setSalesContractApproved] = useState(false);
  const [salesContractApproving, setSalesContractApproving] = useState(false);
  const [
    bundleSalesContractApproved,
    setBundleSalesContractApproved,
  ] = useState({});
  const [auctionContractApproved, setAuctionContractApproved] = useState(false);
  const [auctionContractApproving, setAuctionContractApproving] = useState(
    false
  );

  const [previewIndex, setPreviewIndex] = useState(0);
  const [minBid, setMinBid] = useState(0);
  const [bundleInfo, setBundleInfo] = useState();
  const [creator, setCreator] = useState();
  const [creatorInfo, setCreatorInfo] = useState();
  const [creatorInfoLoading, setCreatorInfoLoading] = useState(false);
  const [info, setInfo] = useState();
  const [owner, setOwner] = useState();
  const [ownerInfo, setOwnerInfo] = useState();
  const [ownerInfoLoading, setOwnerInfoLoading] = useState(false);
  const [tokenOwnerLoading, setTokenOwnerLoading] = useState(false);
  const tokenType = useRef();
  const contentType = useRef();
  const [tokenInfo, setTokenInfo] = useState();
  const [tokenUri, setTokenUri] = useState('');
  const [holders, setHolders] = useState([]);
  const likeUsers = useRef([]);
  const [collections, setCollections] = useState([]);
  const [collection, setCollection] = useState();
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [fetchInterval, setFetchInterval] = useState(null);
  const [collectionRoyalty, setCollectionRoyalty] = useState(null);
  const [nftRoyalty, setNftRoyalty] = useState(null);
  const [platformFee, setPlatformFee] = useState(null);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [burnModalVisible, setBurnModalVisible] = useState(false);
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [auctionModalVisible, setAuctionModalVisible] = useState(false);
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [ownersModalVisible, setOwnersModalVisible] = useState(false);
  const [likesModalVisible, setLikesModalVisible] = useState(false);

  const [transferring, setTransferring] = useState(false);
  const [burning, setBurning] = useState(false);
  const [listingItem, setListingItem] = useState(false);
  const [listingConfirming, setListingConfirming] = useState(false);
  const [cancelingListing, setCancelingListing] = useState(false);
  const [cancelListingConfirming, setCancelListingConfirming] = useState(false);
  const [priceUpdating, setPriceUpdating] = useState(false);
  const [offerPlacing, setOfferPlacing] = useState(false);
  const [offerConfirming, setOfferConfirming] = useState(false);
  const [offerCanceling, setOfferCanceling] = useState(false);
  const [offerAccepting, setOfferAccepting] = useState(false);
  const [buyingItem, setBuyingItem] = useState(false);
  const [auctionStarting, setAuctionStarting] = useState(false);
  const [auctionStartConfirming, setAuctionStartConfirming] = useState(false);
  const [auctionUpdating, setAuctionUpdating] = useState(false);
  const [auctionUpdateConfirming, setAuctionUpdateConfirming] = useState(false);
  const [auctionCanceling, setAuctionCanceling] = useState(false);
  const [auctionCancelConfirming, setAuctionCancelConfirming] = useState(false);
  const [auctionBidParticipants, setAuctionBidParticipants] = useState(0);
  const [bidPlacing, setBidPlacing] = useState(false);
  const [bidWithdrawing, setBidWithdrawing] = useState(false);
  const [resulting, setResulting] = useState(false);
  const [resulted, setResulted] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [likeUsersFetching, setLikeUsersFetching] = useState(false);
  const [likeFetching, setLikeFetching] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isLike, setIsLike] = useState(false);
  const [liked, setLiked] = useState();
  const [hasUnlockable, setHasUnlockable] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [unlockableContent, setUnlockableContent] = useState('');

  const [bid, setBid] = useState(null);
  const [winner, setWinner] = useState(null);
  const [winningToken, setWinningToken] = useState(null);
  const [winningBid, setWinningBid] = useState(null);
  const [views, setViews] = useState();
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const auction = useRef(null);
  const listings = useRef([]);
  const bundleListing = useRef(null);
  const bundleItems = useRef([]);
  const offers = useRef([]);
  const tradeHistory = useRef([]);
  const transferHistory = useRef([]);
  const moreItems = useRef([]);
  const [prices, setPrices] = useState({});
  const [priceInterval, setPriceInterval] = useState(null);

  const [likeCancelSource, setLikeCancelSource] = useState(null);
  const [filter, setFilter] = useState(0);
  const [shareAnchorEl, setShareAnchorEl] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);

  const prevSalesContract = useRef(null);
  const prevAuctionContract = useRef(null);

  const { authToken } = useSelector(state => state.ConnectWallet);
  const prevAuthToken = usePrevious(authToken);

  const isLoggedIn = () => {
    return account && (ENV === 'MAINNET' ? chainId === 888 : chainId === 999);
  };

  useEffect(() => {
    dispatch(HeaderActions.toggleSearchbar(true));
  }, []);

  const getPrices = async () => {
    try {
      const salesContract = await getSalesContract();
      const data = await Promise.all(
        tokens.map(async token => [
          token.address,
          await salesContract.getPrice(
            token.address || ethers.constants.AddressZero
          ),
        ])
      );
      const _prices = {};
      data.map(([addr, price]) => {
        _prices[addr] = parseFloat(ethers.utils.formatUnits(price, 18));
      });
      setPrices(_prices);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (!tokens) return;

    if (priceInterval) {
      clearInterval(priceInterval);
    }

    getPrices();
    setPriceInterval(setInterval(getPrices, 1000 * 10));

    return () => {
      if (priceInterval) {
        clearInterval(priceInterval);
      }
    };
  }, [tokens]);

  const getBundleInfo = async () => {
    setLoading(true);
    try {
      const { data } = await getBundleDetails(bundleID);
      setBundleInfo(data.bundle);
      setCreator(data.bundle.creator);
      setOwner(data.bundle.owner);
      const _bundleListing = await getBundleListing(
        data.bundle.owner,
        bundleID
      );
      if (_bundleListing) {
        _bundleListing.token = getTokenByAddress(data.bundle.paymentToken);
      }
      bundleListing.current = _bundleListing;
      const items = await Promise.all(
        data.items.map(async item => {
          try {
            const { data: itemData } = await axios.get(item.tokenURI);
            return { ...item, metadata: itemData };
          } catch {
            return item;
          }
        })
      );
      bundleItems.current = items;
      const _addreses = data.items.map(item => item.contractAddress);
      const addresses = [...new Set(_addreses)];
      const collections = await Promise.all(
        addresses.map(async addr => {
          try {
            const { data } = await fetchCollection(addr);
            return data;
          } catch {
            return null;
          }
        })
      );
      setCollections(collections);
    } catch {
      history.replace('/404');
    }
    setLoading(false);
  };

  const getItemDetails = async () => {
    setLoading(true);
    setTokenOwnerLoading(true);
    setHistoryLoading(true);
    tradeHistory.current = [];
    try {
      const {
        data: {
          contentType: _contentType,
          history,
          likes,
          listings: _listings,
          offers: _offers,
          nfts,
          tokenType: type,
          uri,
          hasUnlockable: _hasUnlockable,
          thumbnailPath,
          owner
        },
      } = await fetchItemDetails(address, tokenID);

      contentType.current = _contentType;
      console.log('!contentType', contentType);
      tradeHistory.current = history
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map(history => ({
          ...history,
          token: getTokenByAddress(history.paymentToken),
        }));
      setLiked(likes);
      setHasUnlockable(_hasUnlockable);
      listings.current = _listings.map(listing => ({
        ...listing,
        token: getTokenByAddress(listing.paymentToken),
      }));
      offers.current = _offers.map(offer => ({
        ...offer,
        token: getTokenByAddress(offer.paymentToken),
      }));

      moreItems.current = nfts;

      try {
        tokenType.current = type;
        if (type === 721) {
         // const contract = await getERC721Contract(address);
          // In Auction //
          const res = auction?.current?.owner
            ? auction.current.owner
            : owner

          setOwner(res);
        } else if (type === 1155) {
          const { data: _tokenInfo } = await get1155Info(address, tokenID);
          setTokenInfo(_tokenInfo);
          try {
            const { data: _holders } = await getTokenHolders(address, tokenID);
            setHolders(_holders);
            console.log('init holder',_holders);
          } catch {
            setHolders([]);
          }
          setOwner(null);
        }
      } catch {
        setOwner(null);
      }
      let data;
      const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
      if (base64regex.test(uri)) {
        const string = atob(uri);
        data = JSON.parse(string);
      } else {
        const realUri = getRandomIPFS(uri);
        setTokenUri(realUri);
        new URL(realUri);
        const response = await axios.get(realUri);
        data = response.data;
      }

      if (data[Object.keys(data)[0]].image) {
        data.image = getRandomIPFS(data[Object.keys(data)[0]].image);
        data.name = data[Object.keys(data)[0]].name;
        data.description = data[Object.keys(data)[0]].description;
      }
      
      // Sync when content type is media and have animation url //
      if (contentType.current === 'image' && data.animation_url) {
        let contentType = 'image';
        let ext = data.animation_url ? data.animation_url.split('.').pop() : '';
        switch (ext) {
          case 'mp4':
            contentType = 'video';
            break;
          case 'mp3':
            contentType = 'sound';
            break;
          case 'glb':
            contentType = 'model';
            break;
        }

        await axios({
          method: 'post',
          url: `${apiUrl}/nftitems/setContentType`,
          data: JSON.stringify({
            contractAddress: address,
            tokenID: tokenID,
            contentType: contentType,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      if (data.properties?.royalty) {
        data.properties.royalty = parseInt(data.properties.royalty) / 100;
      }

      if (data.image) {
        data.image = getRandomIPFS(data.image);
        // Resync Thumbnail //
        if (thumbnailPath === 'non-image' || thumbnailPath === '.') {
          // Check status of Image //
          let res = await axios.get(data.image);
          if (res.status === 200) {
            await axios({
              method: 'post',
              url: `${apiUrl}/nftitems/resyncThumbnailPath`,
              data: JSON.stringify({
                contractAddress: address,
                tokenID: tokenID,
              }),
              headers: {
                'Content-Type': 'application/json',
              },
            });
          }
        }
      }
      
      setInfo(data);
    } catch (err) {
      console.log('!2 222222', err);

      try {
        console.warn(
          'Failed to retrieve Item data, fallback to fetching from contract'
        );
        const contract = await getERC721Contract(address);
        const tokenURI = await contract.tokenURI(tokenID);
        const realUri = getRandomIPFS(tokenURI);
        setTokenUri(realUri);
        const { data } = await axios.get(realUri);

        if (data.image) {
          data.image = getRandomIPFS(data.image);
        }

        if (data.properties?.royalty) {
          data.properties.royalty = parseInt(data.properties.royalty) / 100;
        }

        setInfo(data);
      } catch {
        history.replace('/404');
      }
    }
    setLoading(false);
    setTokenOwnerLoading(false);
    setHistoryLoading(false);
  };

  const getCreatorInfo = async () => {
    setCreatorInfoLoading(true);
    try {
      const { data } = await getUserAccountDetails(creator);
      setCreatorInfo(data);
    } catch {
      setCreatorInfo(null);
    }
    setCreatorInfoLoading(false);
  };

  const getOwnerInfo = async () => {
    setOwnerInfoLoading(true);
    try {
      const { data } = await getUserAccountDetails(owner);
      setOwnerInfo(data);
    } catch {
      setOwnerInfo(null);
    }
    setOwnerInfoLoading(false);
  };

  const getBundleOffers = async () => {
    try {
      const { data } = await _getBundleOffers(bundleID);
      offers.current = data.map(offer => ({
        ...offer,
        token: getTokenByAddress(offer.paymentToken),
      }));
    } catch (e) {
      console.log(e);
    }
  };

  const getBundleTradeHistory = async () => {
    setHistoryLoading(true);
    tradeHistory.current = [];
    try {
      const { data } = await _getBundleTradeHistory(bundleID);
      tradeHistory.current = data
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map(history => ({
          ...history,
          token: getTokenByAddress(history.paymentToken),
        }));
    } catch (e) {
      console.log(e);
    }
    setHistoryLoading(false);
  };

  const getItemTransferHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data } = await getTransferHistory(
        address,
        tokenID,
        tokenType.current
      );
      transferHistory.current = data.sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : -1
      );
    } catch (e) {
      console.log(e);
    }
    setHistoryLoading(false);
  };

  const getAuctions = async () => {
    try {
      const _auction = await getAuction(address, tokenID);
      if (_auction.endTime !== 0) {
        const token = getTokenByAddress(_auction.payToken);

        let _minBid = parseFloat(
          ethers.utils.formatUnits(_auction.minBid, token.decimals)
        );
        setMinBid(_minBid);

        const reservePrice = parseFloat(
          ethers.utils.formatUnits(_auction.reservePrice, token.decimals)
        );
        auction.current = { ..._auction, reservePrice, token };
      }

      let auctionParticipantsRes = await fetchAuctionBidParticipants(
        address,
        tokenID
      );
      setAuctionBidParticipants(auctionParticipantsRes?.data?.bidParticipants);
    } catch (e) {
      console.log(e);
    }
  };

  const getBid = async () => {
    try {
      if (auction.current) {
        const bid = await getHighestBidder(
          address,
          tokenID,
          auction.current.token.address
        );

        if (bid.bid !== 0) {
          setBid(bid);
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  const eventMatches = (nft, id) => {
    return (
      address?.toLowerCase() === nft?.toLowerCase() &&
      parseFloat(tokenID) === parseFloat(id.toString())
    );
  };

  const itemListedHandler = async (
    owner,
    nft,
    id,
    quantity,
    paymentToken,
    pricePerItem,
    startingTime
  ) => {
    if (eventMatches(nft, id)) {
      const token = getTokenByAddress(paymentToken);
      const newListing = {
        owner,
        quantity: parseFloat(quantity.toString()),
        token,
        price: parseFloat(
          ethers.utils.formatUnits(pricePerItem, token.decimals)
        ),
        startTime: parseFloat(startingTime.toString()),
      };
      try {
        const { data } = await getUserAccountDetails(owner);
        newListing.alias = data?.alias;
        newListing.image = data?.imageHash;
        listings.current.push(newListing);
      } catch {
        listings.current.push(newListing);
      }
      listings.current = listings.current.sort((a, b) =>
        a.price > b.price ? 1 : -1
      );

      setListingConfirming(false);
      showToast('success', 'Item listed successfully!');
    }
  };

  const itemUpdatedHandler = (owner, nft, id, paymentToken, newPrice) => {
    if (eventMatches(nft, id)) {
      const token = getTokenByAddress(paymentToken);
      listings.current.map(listing => {
        if (listing.owner.toLowerCase() === owner.toLowerCase()) {
          listing.token = token;
          listing.price = parseFloat(
            ethers.utils.formatUnits(newPrice, token.decimals)
          );
        }
      });

      setListingConfirming(false);
      showToast('success', 'Price updated successfully!');
    }
  };

  const itemCanceledHandler = (owner, nft, id) => {
    if (eventMatches(nft, id)) {
      listings.current = listings.current.filter(
        listing => listing.owner.toLowerCase() !== owner.toLowerCase()
      );
      setCancelListingConfirming(false);
      showToast('success', 'Item unlisted successfully!');
    }
  };

  


  const itemSoldHandler = async (
    seller,
    buyer,
    nft,
    id,
    _quantity,
    paymentToken,
    unitPrice,
    price
  ) => {
    const quantity = parseFloat(_quantity.toString());

    if (eventMatches(nft, id)) {
      if (tokenType.current === 721) {
        setOwner(buyer);
        listings.current = listings.current.filter(
          listing => listing.owner.toLowerCase() !== seller.toLowerCase()
        );
      } else {
        const { data: _holders } = await getTokenHolders(address, tokenID);
        console.log('previous holders', _holders);
        const newHolders = [..._holders];
        
        const sellerIndex = newHolders.findIndex(
          holder => holder.address.toLowerCase() === seller.toLowerCase()
        );
        const buyerIndex = newHolders.findIndex(
          holder => holder.address.toLowerCase() === buyer.toLowerCase()
        );
        if (sellerIndex > -1) {
          //newHolders[sellerIndex].supply -= quantity;
        }
        if (buyerIndex > -1) {
          //newHolders[buyerIndex].supply += quantity;
        } else {
          const buyerInfo = {
            address: buyer,
            supply: quantity,
          };
          try {
            const { data } = await getUserAccountDetails(buyer);
            buyerInfo.alias = data.alias;
            buyerInfo.imageHash = data.imageHash;
          } catch (e) {
            console.log(e);
          }
          newHolders.push(buyerInfo);
        }

        if (newHolders[sellerIndex]?.supply === 0) {
          newHolders.splice(sellerIndex, 1);
        }

        console.log('newHolders', newHolders);
        console.log('listings', listings.current);
        setHolders(newHolders);
        /*
        listings.current = listings.current.filter(
          listing => listing.owner.toLowerCase() !== seller.toLowerCase()
        );
        */
        listings.current.map((v, i) => {
          if (v.owner.toLowerCase() === seller.toLowerCase()) {
            if (listings.current[i].quantity > Number(quantity)) {
              listings.current[i].quantity =
                listings.current[i].quantity - Number(quantity);
            } else {
              delete listings.current[i];
            }
          }
        });
      }
      const token = getTokenByAddress(paymentToken);
      const _price = parseFloat(
        ethers.utils.formatUnits(price, token.decimals)
      );
      const newTradeHistory = {
        from: seller,
        to: buyer,
        price: _price,
        value: quantity,
        createdAt: new Date().toISOString(),
        paymentToken,
        token,
        priceInUSD:
          parseFloat(ethers.utils.formatUnits(unitPrice, 18)) * _price,
      };
      try {
        const from = await getUserAccountDetails(seller);
        newTradeHistory.fromAlias = from?.data.alias;
        newTradeHistory.fromImage = from?.data.imageHash;
      } catch (e) {
        console.log(e);
      }
      try {
        const to = await getUserAccountDetails(buyer);
        newTradeHistory.toAlias = to?.data.alias;
        newTradeHistory.toImage = to?.data.imageHash;
      } catch (e) {
        console.log(e);
      }
      tradeHistory.current = [newTradeHistory, ...tradeHistory.current];

      showToast('success', 'Item has been sold!');
      setBuyingItem(false);
    }
  };

  const offerCreatedHandler = async (
    creator,
    nft,
    id,
    quantity,
    payToken,
    pricePerItem,
    deadline
  ) => {
    if (eventMatches(nft, id)) {
      const token = getTokenByAddress(payToken);
      const newOffer = {
        creator,
        deadline: parseFloat(deadline.toString()) * 1000,
        token,
        pricePerItem: parseFloat(
          ethers.utils.formatUnits(pricePerItem, token.decimals)
        ),
        quantity: parseFloat(quantity.toString()),
      };
      try {
        const { data } = await getUserAccountDetails(creator);
        newOffer.alias = data.alias;
        newOffer.image = data.imageHash;
      } catch (e) {
        console.log(e);
      }
      offers.current.push(newOffer);
      setOfferConfirming(false);
      showToast('success', 'Offer placed successfully!');
    }
  };

  const offerCanceledHandler = (creator, nft, id) => {
    if (eventMatches(nft, id)) {
      const newOffers = offers.current.filter(
        offer => offer.creator?.toLowerCase() !== creator?.toLowerCase()
      );
      offers.current = newOffers;
      setOfferCanceling(false);
      setOfferConfirming(false);
      showToast('success', 'You have withdrawn your offer!');
    }
  };

  const bundleListedHandler = (
    _owner,
    _bundleID,
    _payToken,
    _price,
    _startingTime
  ) => {
    if (bundleID.toLowerCase() === _bundleID.toLowerCase()) {
      const token = getTokenByAddress(_payToken);
      const price = parseFloat(
        ethers.utils.formatUnits(_price, token.decimals)
      );
      bundleListing.current = {
        price,
        startingTime: parseInt(_startingTime.toString()),
        token,
      };
    }
  };

  const bundleUpdatedHandler = (
    _owner,
    _bundleID,
    _nfts,
    _tokenIds,
    _quantities,
    _newPrice
  ) => {
    const nfts = _nfts.map(val => val);
    const tokenIds = _tokenIds.map(val => parseInt(val.toString()));
    const quantities = _quantities.map(val => parseInt(val.toString()));
    if (bundleID.toLowerCase() === _bundleID.toLowerCase()) {
      if (nfts.length === 0) {
        history.push('/explore');
      }

      const price = parseFloat(_newPrice.toString()) / 10 ** 18;
      bundleListing.current.price = price;
      const newBundleItems = [];
      bundleItems.current.map(item => {
        let idx = 0;
        while (idx < nfts.length) {
          const address = nfts[idx];
          const tokenId = tokenIds[idx];
          const quantity = quantities[idx];
          if (
            address.toLowerCase() === item.contractAddress.toLowerCase() &&
            tokenId === item.tokenID
          ) {
            item.supply = quantity;
            newBundleItems.push(item);
            nfts.splice(idx, 1);
            tokenIds.splice(idx, 1);
            quantities.splice(idx, 1);
            break;
          }
          idx++;
        }
      });
      bundleItems.current = newBundleItems;
    }
  };

  const bundleCanceledHandler = (_owner, _bundleID) => {
    if (bundleID.toLowerCase() === _bundleID.toLowerCase()) {
      bundleListing.current = null;
    }
  };

  const bundleSoldHandler = async (
    _seller,
    _buyer,
    _bundleID,
    _payToken,
    _unitPrice,
    _price
  ) => {
    if (bundleID.toLowerCase() === _bundleID.toLowerCase()) {
      setOwner(_buyer);
      bundleListing.current = null;
      const token = getTokenByAddress(_payToken);
      const price = parseFloat(
        ethers.utils.formatUnits(_price, token.decimals)
      );
      const newTradeHistory = {
        from: _seller,
        to: _buyer,
        price,
        value: 1,
        createdAt: new Date().toISOString(),
        token,
        priceInUSD:
          parseFloat(ethers.utils.formatUnits(_unitPrice, 18)) * price,
      };
      try {
        const from = await getUserAccountDetails(_seller);
        newTradeHistory.fromAlias = from?.data.alias;
        newTradeHistory.fromImage = from?.data.imageHash;
      } catch (e) {
        console.log(e);
      }
      try {
        const to = await getUserAccountDetails(_buyer);
        newTradeHistory.toAlias = to?.data.alias;
        newTradeHistory.toImage = to?.data.imageHash;
      } catch (e) {
        console.log(e);
      }
      tradeHistory.current = [newTradeHistory, ...tradeHistory.current];
    }
  };

  const bundleOfferCreatedHandler = async (
    _creator,
    _bundleID,
    _payToken,
    _price,
    _deadline
  ) => {
    if (bundleID.toLowerCase() === _bundleID.toLowerCase()) {
      const token = getTokenByAddress(_payToken);
      const newOffer = {
        creator: _creator,
        deadline: parseFloat(_deadline.toString()) * 1000,
        pricePerItem: parseFloat(
          ethers.utils.formatUnits(_price, token.decimals)
        ),
        quantity: 1,
        token,
      };
      try {
        const { data } = await getUserAccountDetails(_creator);
        newOffer.alias = data.alias;
        newOffer.image = data.imageHash;
      } catch (e) {
        console.log(e);
      }
      offers.current.push(newOffer);
    }
  };

  const bundleOfferCanceledHandler = (_creator, _bundleID) => {
    if (bundleID.toLowerCase() === _bundleID.toLowerCase()) {
      const newOffers = offers.current.filter(
        offer => offer.creator?.toLowerCase() !== _creator?.toLowerCase()
      );
      offers.current = newOffers;
    }
  };

  const auctionCreatedHandler = (nft, id) => {
    if (eventMatches(nft, id)) {
      getAuctions().then(() => {
        setAuctionStartConfirming(false);
        showToast('success', 'Auction started!');
      });
    }
  };

  const auctionEndTimeUpdatedHandler = (nft, id, _endTime) => {
    if (eventMatches(nft, id)) {
      const endTime = parseFloat(_endTime.toString());
      if (auction.current) {
        setAuctionUpdateConfirming(false);
        showToast('success', 'Auction end time updated successfully!');
        const newAuction = { ...auction.current, endTime };
        auction.current = newAuction;
      }
    }
  };

  const auctionStartTimeUpdatedHandler = (nft, id, _startTime) => {
    if (eventMatches(nft, id)) {
      const startTime = parseFloat(_startTime.toString());
      if (auction.current) {
        setAuctionUpdateConfirming(false);
        showToast('success', 'Auction start time updated successfully!');
        const newAuction = { ...auction.current, startTime };
        auction.current = newAuction;
      }
    }
  };

  const auctionReservePriceUpdatedHandler = (nft, id, _payToken, _price) => {
    if (eventMatches(nft, id)) {
      if (auction.current) {
        setAuctionUpdateConfirming(false);
        showToast('success', 'Auction reserve price updated successfully!');
        const price = ethers.utils.formatUnits(
          _price,
          auction.current.token.decimals
        );
        const newAuction = { ...auction.current, reservePrice: price };
        auction.current = newAuction;
      }
    }
  };

  const bidPlacedHandler = async (nft, id, bidder, _bid) => {
    if (eventMatches(nft, id)) {
      const bid = parseFloat(_bid.toString()) / 10 ** 18;
      setBid({
        bidder,
        bid,
        lastBidTime: Math.floor(new Date().getTime() / 1000),
      });
      let auctionParticipantsRes = await fetchAuctionBidParticipants(
        address,
        tokenID
      );
      setAuctionBidParticipants(auctionParticipantsRes?.data?.bidParticipants);
    }
  };

  const bidWithdrawnHandler = (nft, id) => {
    if (eventMatches(nft, id)) {
      setBid(null);
    }
  };

  const auctionCancelledHandler = (nft, id) => {
    if (eventMatches(nft, id)) {
      setAuctionCancelConfirming(false);
      showToast('success', 'Auction canceled!');
      auction.current = null;
      setBid(null);
    }
  };

  function auctionResultedHandler(
    nft,
    id,
    winner,
    payToken,
    unitPrice,
    _winningBid
  ) {
    if (eventMatches(nft, id)) {
      const newAuction = { ...auction.current, resulted: true };
      auction.current = newAuction;
      setWinner(winner);
      const token = getTokenByAddress(payToken);
      setWinningToken(token);
      const winningBid = parseFloat(_winningBid.toString()) / 10 ** 18;
      setWinningBid(winningBid);
    }
  }

  const addEventListeners = async () => {
    const salesContract = await getSalesContract();
    const auctionContract = await getAuctionContract();

    salesContract.on('ItemListed', itemListedHandler);
    salesContract.on('ItemUpdated', itemUpdatedHandler);
    salesContract.on('ItemCanceled', itemCanceledHandler);
    salesContract.on('ItemSold', itemSoldHandler);
    salesContract.on('OfferCreated', offerCreatedHandler);
    salesContract.on('OfferCanceled', offerCanceledHandler);

    prevSalesContract.current = salesContract;
    prevAuctionContract.current = auctionContract;

    auctionContract.on('AuctionCreated', auctionCreatedHandler);
    auctionContract.on(
      'UpdateAuctionStartTime',
      auctionStartTimeUpdatedHandler
    );
    auctionContract.on('UpdateAuctionEndTime', auctionEndTimeUpdatedHandler);
    auctionContract.on(
      'UpdateAuctionReservePrice',
      auctionReservePriceUpdatedHandler
    );
    auctionContract.on('BidPlaced', bidPlacedHandler);
    auctionContract.on('BidWithdrawn', bidWithdrawnHandler);
    auctionContract.on('AuctionCancelled', auctionCancelledHandler);
    auctionContract.on('AuctionResulted', auctionResultedHandler);
  };

  const removeEventListeners = async () => {
    prevSalesContract.current?.removeAllListeners();
    prevAuctionContract.current?.removeAllListeners();
  };

  const addBundleEventListeners = async () => {
    const bundleSalesContract = await getBundleSalesContract();

    bundleSalesContract.on('ItemListed', bundleListedHandler);
    bundleSalesContract.on('ItemUpdated', bundleUpdatedHandler);
    bundleSalesContract.on('ItemCanceled', bundleCanceledHandler);
    bundleSalesContract.on('ItemSold', bundleSoldHandler);
    bundleSalesContract.on('OfferCreated', bundleOfferCreatedHandler);
    bundleSalesContract.on('OfferCanceled', bundleOfferCanceledHandler);
  };

  const removeBundleEventListeners = async () => {
    const bundleSalesContract = await getBundleSalesContract();

    bundleSalesContract.off('ItemListed', bundleListedHandler);
    bundleSalesContract.off('ItemUpdated', bundleUpdatedHandler);
    bundleSalesContract.off('ItemCanceled', bundleCanceledHandler);
    bundleSalesContract.off('ItemSold', bundleSoldHandler);
    bundleSalesContract.off('OfferCreated', bundleOfferCreatedHandler);
    bundleSalesContract.off('OfferCanceled', bundleOfferCanceledHandler);
  };

  const getCollection = async () => {
    setCollectionLoading(true);
    try {
      const { data } = await fetchCollection(address);
      setCollection(data);
    } catch (err) {
      console.log(err);
    }
    setCollectionLoading(false);
  };

  const updateCollections = async () => {
    try {
      dispatch(CollectionsActions.fetchStart());
      const res = await fetchCollections();
      if (res.status === 'success') {
        const verified = [];
        const unverified = [];
        res.data.map(item => {
          if (item.isVerified) verified.push(item);
          else unverified.push(item);
        });
        dispatch(CollectionsActions.fetchSuccess([...verified, ...unverified]));
      }
    } catch {
      dispatch(CollectionsActions.fetchFailed());
    }
  };

  useEffect(() => {
    if (address && tokenID) {
      addEventListeners();

      if (fetchInterval) {
        clearInterval(fetchInterval);
      }

      updateCollections();
      setFetchInterval(setInterval(updateCollections, 1000 * 60 * 10));
    }

    if (bundleID) {
      addBundleEventListeners();
    }

    setInterval(() => {
      setNow(new Date());
    }, 5000);

    return () => {
      if (address && tokenID) {
        removeEventListeners();
      }

      if (bundleID) {
        removeBundleEventListeners();
      }
    };
  }, [chainId]); // ,holders TODO: Don't know need to add or not

  useEffect(() => {
    setLiked(null);
    console.log('!bundleID', bundleID);
    if (bundleID) {
      listings.current = [];

      getBundleInfo();
      getBundleOffers();
      getBundleTradeHistory();

      increaseBundleViewCount(bundleID).then(({ data }) => {
        setViews(data);
      });
      getBundleLikes(bundleID).then(({ data }) => {
        setLiked(data);
      });
      isLikingBundle(bundleID, account).then(({ data }) => {
        setIsLike(data);
      });
    } else {
      bundleListing.current = null;
      console.log('!getItemDetails', bundleListing);
      
      getItemDetails(); // TODO: Need to optimize
      
      getAuctions().then(() => {
        getBid();
        
      });

      increaseViewCount(address, tokenID).then(({ data }) => {
        setViews(data);
      });
      isLikingItem(address, tokenID, account).then(({ data }) => {
        setIsLike(data);
      });
    }

    getLikeInfo();
  }, [address, tokenID, bundleID]);

  useEffect(() => {
    if (!address) {
      setCollectionRoyalty(null);
      return;
    }

    getNFTRoyalty(address, tokenID)
      .then(res => {
        //alert(res);

        if (resultAuction) {
          setNftRoyalty({
            royalty: res / 100,
          });
        } else {
          setNftRoyalty({
            royalty: 0,
          });
        }
      })
      .catch(console.log);

    getPlatformFee()
      .then(res => {
        //alert(res);

        if (resultAuction) {
          setPlatformFee({
            royalty: res / 10,
          });
        } else {
          setPlatformFee({
            royalty: 0,
          });
        }
      })
      .catch(console.log);

    getCollectionRoyalty(address)
      .then(res => {
        if (res.royalty) {
          setCollectionRoyalty({
            royalty: res.royalty / 100,
            feeRecipient: res.feeRecipient,
          });
        } else {
          setCollectionRoyalty({
            royalty: 0,
            feeRecipient: null,
          });
        }
      })
      .catch(console.log);
  }, [address]);

  useEffect(() => {
    if (address && tokenID && tokenType.current && filter === 1) {
      getItemTransferHistory();
    }
  }, [address, tokenID, tokenType.current, filter]);

  useEffect(() => {
    getCreatorInfo();
  }, [creator]);

  useEffect(() => {
    getOwnerInfo();
  }, [owner]);

  const updateItems = async () => {
    try {
      if (!authToken) {
        moreItems.current = tokens.map(tk => ({
          ...tk,
          isLiked: false,
        }));
        return;
      }
      let missingTokens = moreItems.current.map((tk, index) =>
        tk.items
          ? {
              index,
              isLiked: tk.isLiked,
              bundleID: tk._id,
            }
          : {
              index,
              isLiked: tk.isLiked,
              contractAddress: tk.contractAddress,
              tokenID: tk.tokenID,
            }
      );
      if (prevAuthToken) {
        missingTokens = missingTokens.filter(tk => tk.isLiked === undefined);
      }

      const cancelTokenSource = axios.CancelToken.source();
      setLikeCancelSource(cancelTokenSource);
      const { data, status } = await getItemsLiked(
        missingTokens,
        authToken,
        cancelTokenSource.token
      );
      if (status === 'success') {
        const newTokens = [...moreItems.current];
        missingTokens.map((tk, idx) => {
          newTokens[tk.index].isLiked = data[idx].isLiked;
        });
        // eslint-disable-next-line require-atomic-updates
        moreItems.current = newTokens;
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLikeCancelSource(null);
    }
  };

  useEffect(() => {
    if (likeCancelSource) {
      likeCancelSource.cancel();
    }
    if (moreItems.current.length) {
      updateItems();
    }
  }, [moreItems, authToken]);

  const getLikeInfo = async () => {
    setLikeFetching(true);
    try {
      if (bundleID) {
        const { data } = await isLikingBundle(bundleID, account);
        setIsLike(data);
      } else {
        const { data } = await isLikingItem(address, tokenID, account);
        setIsLike(data);
      }
    } catch (err) {
      console.log(err);
    }
    setLikeFetching(false);
  };

  const toggleFavorite = async e => {
    e.preventDefault();
    if (isLiking) return;

    setIsLiking(true);
    try {
      if (bundleID) {
        const { data } = await likeBundle(bundleID, authToken);
        setLiked(data);
      } else {
        const { data } = await likeItem(address, tokenID, authToken);
        setLiked(data);
      }
    } catch (err) {
      console.log(err);
    }
    setIsLike(!isLike);
    setIsLiking(false);
  };

  const showLikeUsers = async () => {
    if (likeUsersFetching) return;

    setLikesModalVisible(true);
    setLikeUsersFetching(true);
    try {
      if (bundleID) {
        const { data } = await getBundleLikeUsers(bundleID);
        likeUsers.current = data;
      } else {
        const { data } = await getItemLikeUsers(address, tokenID);
        likeUsers.current = data;
      }
    } catch (err) {
      console.log(err);
    }
    setLikeUsersFetching(false);
  };

  const getSalesContractStatus = async () => {
    const contract = await getERC721Contract(address);
    try {
      const approved = await contract.isApprovedForAll(
        account,
        Contracts[CHAIN].sales
      );
      setSalesContractApproved(approved);
    } catch (e) {
      console.log(e);
    }
  };

  const getBundleSalesContractStatus = async () => {
    let contractAddresses = bundleItems.current.map(
      item => item.contractAddress
    );
    contractAddresses = contractAddresses.filter(
      (addr, idx) => contractAddresses.indexOf(addr) === idx
    );
    const approved = {};
    await Promise.all(
      contractAddresses.map(async address => {
        const contract = await getERC721Contract(address);
        try {
          const _approved = await contract.isApprovedForAll(
            account,
            Contracts[chainId].bundleSales
          );
          approved[address] = _approved;
        } catch (e) {
          console.log(e);
        }
      })
    );
    setBundleSalesContractApproved(approved);
  };

  const getAuctionContractStatus = async () => {
    const contract = await getERC721Contract(address);
    try {
      const approved = await contract.isApprovedForAll(
        account,
        Contracts[chainId].auction
      );
      setAuctionContractApproved(approved);
    } catch (e) {
      console.log(e);
    }
  };

  const addNFTContractEventListeners = async () => {
    const contract = await getERC721Contract(address);

    contract.on('ApprovalForAll', (owner, operator, approved) => {
      if (account?.toLowerCase() === owner?.toLowerCase()) {
        if (operator === Contracts[chainId].auction) {
          setAuctionContractApproved(approved);
        } else if (operator === Contracts[chainId].sales) {
          setSalesContractApproved(approved);
        }
      }
    });
  };

  useEffect(() => {
    if (address && account && chainId) {
      getSalesContractStatus();
      getAuctionContractStatus();
    }
  }, [address, account, chainId]);

  useEffect(() => {
    if (bundleItems.current && account && chainId) {
      getBundleSalesContractStatus();
    }
  }, [bundleItems.current, account, chainId]);

  useEffect(() => {
    if (address) {
      addNFTContractEventListeners();
      getCollection();
    }
  }, [address]);

  const handleApproveSalesContract = async () => {
    setSalesContractApproving(true);
    try {
      const contract = await getERC721Contract(address);
      const tx = await contract.setApprovalForAll(
        Contracts[chainId].sales,
        true
      );
      await tx.wait();
      setSalesContractApproved(true);
    } catch (e) {
      console.log(e);
    } finally {
      setSalesContractApproving(false);
    }
  };

  const handleApproveBundleSalesContract = async () => {
    if (salesContractApproving) return;
    if (bundleItems.current.length === 0) return;

    setSalesContractApproving(true);
    try {
      let contractAddresses = bundleItems.current.map(
        item => item.contractAddress
      );
      contractAddresses = contractAddresses.filter(
        (addr, idx) => contractAddresses.indexOf(addr) === idx
      );
      const approved = {};
      await Promise.all(
        contractAddresses.map(async address => {
          const contract = await getERC721Contract(address);
          const _approved = await contract.isApprovedForAll(
            account,
            Contracts[chainId].bundleSales
          );
          if (!_approved) {
            const tx = await contract.setApprovalForAll(
              Contracts[chainId].bundleSales,
              true
            );
            await tx.wait();
          }
          approved[address] = true;
        })
      );
      setBundleSalesContractApproved(approved);
    } catch (e) {
      console.log(e);
    } finally {
      setSalesContractApproving(false);
    }
  };

  const handleApproveAuctionContract = async () => {
    setAuctionContractApproving(true);
    try {
      const contract = await getERC721Contract(address);
      const tx = await contract.setApprovalForAll(
        Contracts[chainId].auction,
        true
      );
      await tx.wait();
      setAuctionContractApproved(true);
    } catch (e) {
      console.log(e);
    } finally {
      setAuctionContractApproving(false);
    }
  };

  const myHolding = useMemo(
    () =>
      holders.find(
        holder => holder.address.toLowerCase() === account?.toLowerCase()
      ),
    [holders, account]
  );

  const isMine =
    tokenType.current === 721 || bundleID
      ? owner?.toLowerCase() === account?.toLowerCase()
      : !!myHolding;

  const handleBurn = async (to) => {

    if (burning) return;

    setBurning(true);

    try {
      if (tokenType.current === 721) {
        const contract = await getERC721Contract(address);
        const tx = await contract.safeTransferFrom(account, to, tokenID);
        await tx.wait();
        showToast('success', 'Item Burned successfully!');
        setOwner(to);
        setBurnModalVisible(false);
        getItemDetails();
      }
    } catch {
      showToast('error', 'Failed to burn item!');
    }

    setBurning(false);
  };

  const handleTransfer = async (to, quantity) => {
    if (bundleID) return;

    if (!ethers.utils.isAddress(to)) {
      showToast('error', 'Invalid Address!');
      return;
    }

    if (transferring) return;

    setTransferring(true);

    try {
      if (tokenType.current === 721) {
        const contract = await getERC721Contract(address);
        const tx = await contract.safeTransferFrom(account, to, tokenID);
        await tx.wait();
        showToast('success', 'Item transferred successfully!');
        setOwner(to);
        setTransferModalVisible(false);
        getItemDetails();
      } else {
        const contract = await getERC1155Contract(address);
        const tx = await contract.safeTransferFrom(
          account,
          to,
          tokenID,
          quantity,
          '0x'
        );
        await tx.wait();
        showToast('success', 'Item transferred successfully!');

        const newHolders = [...holders];
        let sender = -1,
          receiver = -1;
        for (let i = 0; i < newHolders.length; i++) {
          if (
            newHolders[i].address.toLowerCase() === account.toLocaleLowerCase()
          ) {
            sender = i;
            newHolders[i].supply -= quantity;
          } else if (
            newHolders[i].address.toLowerCase() === to.toLocaleLowerCase()
          ) {
            receiver = i;
            newHolders[i].supply += quantity;
          }
          if (sender > -1 && receiver > -1) {
            break;
          }
        }
        if (newHolders[sender].supply === 0) {
          newHolders.splice(sender, 1);
        }
        if (receiver === -1) {
          let newHolder = {
            address: to,
            supply: quantity,
          };
          try {
            const res = await getUserAccountDetails(to);
            newHolder.alias = res?.data.alias;
            newHolder.imageHash = res?.data.imageHash;
          } catch (e) {
            console.log(e);
          }
          newHolders.push(newHolder);
        }
        setHolders(newHolders);

        setTransferModalVisible(false);
      }
    } catch {
      showToast('error', 'Failed to transfer item!');
    }

    setTransferring(false);
  };

  const handleListItem = async (token, _price, quantity) => {
    if (listingItem) return;

    try {
      setListingItem(true);
      setListingConfirming(true);

      const price = ethers.utils.parseUnits(_price, token.decimals);
      if (bundleID) {
        const addresses = [];
        const tokenIds = [];
        const quantities = [];
        bundleItems.current.map(item => {
          addresses.push(item.contractAddress);
          tokenIds.push(item.tokenID);
          quantities.push(item.supply);
        });
        const tx = await listBundle(
          bundleID,
          addresses,
          tokenIds,
          quantities,
          token.address === '' ? ethers.constants.AddressZero : token.address,
          price,
          ethers.BigNumber.from(Math.floor(new Date().getTime() / 1000))
        );
        await tx.wait();

        showToast('success', 'Bundle listed successfully!');
      } else {
        const tx = await listItem(
          address,
          ethers.BigNumber.from(tokenID),
          ethers.BigNumber.from(quantity),
          token.address === '' ? ethers.constants.AddressZero : token.address,
          price,
          ethers.BigNumber.from(Math.floor(new Date().getTime() / 1000))
        );
        await tx.wait();
      }

      setSellModalVisible(false);
      setListingItem(false);
    } catch (err) {
      showToast('error', formatError(err));
      setListingConfirming(false);
      console.log(err);
      setListingItem(false);
    }
  };

  const isBundleContractApproved = (() => {
    if (bundleItems.current.length === 0) return false;
    let contractAddresses = bundleItems.current.map(
      item => item.contractAddress
    );
    contractAddresses = contractAddresses.filter(
      (addr, idx) => contractAddresses.indexOf(addr) === idx
    );
    const approved = contractAddresses
      .map(addr => bundleSalesContractApproved[addr])
      .reduce((cur, _approved) => cur && _approved, true);
    return approved;
  })();

  const handleRevealContent = async () => {
    if (revealing) return;

    try {
      setRevealing(true);

      const { data: nonce } = await getNonce(account, authToken);
      let signature;
      let addr;
      try {
        const signer = await getSigner();
        const msg = `Approve Signature on OpenZoo.io with nonce ${nonce}`;
        signature = await signer.signMessage(msg);
        addr = ethers.utils.verifyMessage(msg, signature);
      } catch {
        showToast(
          'error',
          'You need to sign the message to be able to update account settings.'
        );
        setRevealing(false);
        return;
      }

      const { data } = await retrieveUnlockableContent(
        address,
        tokenID,
        signature,
        addr,
        authToken
      );
      setUnlockableContent(data);
      setRevealing(false);
    } catch {
      setRevealing(false);
    }
  };

  const handleUpdateListing = async (token, _price, quantity) => {
    if (priceUpdating) return;

    try {
      setPriceUpdating(true);
      setListingConfirming(true);

      const price = ethers.utils.parseUnits(_price, token.decimals);
      if (bundleID) {
        const tx = await updateBundleListing(bundleID, price);
        await tx.wait();
      } else {
        const tx = await updateListing(
          address,
          tokenID,
          token.address === '' ? ethers.constants.AddressZero : token.address,
          price,
          ethers.BigNumber.from(quantity)
        );
        await tx.wait();
      }

      setPriceUpdating(false);
      setSellModalVisible(false);
    } catch (e) {
      setListingConfirming(false);
      showToast('error', formatError(e));
      setPriceUpdating(false);
    }
  };

  const cancelList = async () => {
    if (cancelingListing) return;

    setCancelingListing(true);
    setCancelListingConfirming(true);
    try {
      if (bundleID) {
        await cancelBundleListing(bundleID);
        bundleListing.current = null;
        showToast('success', 'Bundle unlisted successfully!');
      } else {
        await cancelListing(address, tokenID);
      }
    } catch (e) {
      setCancelListingConfirming(false);
      showToast('error', formatError(e));
      console.log(e);
    }
    setCancelingListing(false);
  };

  const handleBuyItem = async listing => {
    if (buyingItem) return;

    try {
      setBuyingItem(true);
      const _price = listing.price; //TODO: later * listing.quantity; real quantity
      
      if (listing.token.address === '') {
        const price = ethers.utils.parseEther(_price.toString());

        const tx = await buyItemETH(
          address,
          ethers.BigNumber.from(tokenID),
          listing.owner,
          price,
          account
        );
        await tx.wait();
      } else {
        const erc20 = await getERC20Contract(listing.token.address);
        const balance = await erc20.balanceOf(account);
        const price = ethers.utils.parseUnits(
          _price.toString(),
          listing.token.decimals
        );
        if (balance.lt(price)) {
          const toastId = showToast(
            'error',
            `Insufficient ${listing.token.symbol} Balance!`,
            listing.token.symbol === 'WFTM' || listing.token.symbol === 'WWAN'
              ? 'You can wrap WAN in the WWAN station.'
              : `You can exchange ${listing.token.symbol} on other exchange site.`,
            () => {
              toast.dismiss(toastId);
              if (
                listing.token.symbol === 'WFTM' ||
                listing.token.symbol === 'WWAN'
              ) {
                dispatch(ModalActions.showWFTMModal());
              }
            }
          );
          setBuyingItem(false);
          return;
        }
        const salesContract = await getSalesContract();
        const allowance = await erc20.allowance(account, salesContract.address);
        if (allowance.lt(price)) {
          const tx = await erc20.approve(salesContract.address, price);
          await tx.wait();
        }
        if (listing.quantity > 1) {
          // for 1155
          const tx = await buyItemERC20WithQuantity(
            address,
            ethers.BigNumber.from(tokenID),
            listing.token.address,
            listing.owner,
            1
          );
          await tx.wait();
        } // for 721
        else {
          const tx = await buyItemERC20(
            address,
            ethers.BigNumber.from(tokenID),
            listing.token.address,
            listing.owner
          );
          await tx.wait();
          listings.current = listings.current.filter(
            _listing => _listing.owner !== listing.owner
          );
        }
      }

      setOwner(account);
    } catch (error) {
      console.log(error);
      showToast('error', formatError(error));
      setBuyingItem(false);
    }
  };

  const handleBuyBundle = async () => {
    if (buyingItem) return;

    try {
      setBuyingItem(true);
      const { token } = bundleListing.current;
      const price = ethers.utils.parseUnits(
        bundleListing.current.price.toString(),
        token.decimals
      );
      if (token.address === '') {
        const tx = await buyBundleETH(bundleID, price, account);
        await tx.wait();
      } else {
        const erc20 = await getERC20Contract(token.address);
        const balance = await erc20.balanceOf(account);
        if (balance.lt(price)) {
          const toastId = showToast(
            'error',
            `Insufficient ${token.symbol} Balance!`,
            token.symbol === 'WFTM' || token.symbol === 'WWAN'
              ? 'You can wrap WAN in the WWAN station.'
              : `You can exchange ${token.symbol} on other exchange site.`,
            () => {
              toast.dismiss(toastId);
              if (token.symbol === 'WFTM' || token.symbol === 'WWAN') {
                dispatch(ModalActions.showWFTMModal());
              }
            }
          );
          setBuyingItem(false);
          return;
        }
        const salesContract = await getBundleSalesContract();
        const allowance = await erc20.allowance(account, salesContract.address);
        if (allowance.lt(price)) {
          const tx = await erc20.approve(salesContract.address, price);
          await tx.wait();
        }

        const tx = await buyBundleERC20(bundleID, token.address);
        await tx.wait();
      }

      setOwner(account);

      // eslint-disable-next-line require-atomic-updates
      bundleListing.current = null;
    } catch (error) {
      showToast('error', formatError(error));
      setBuyingItem(false);
    }
  };

  const handleMakeOffer = async (token, _price, quantity, endTime) => {
    if (offerPlacing) return;

    try {
      setOfferPlacing(true);
      setOfferConfirming(true);
      const price = ethers.utils.parseUnits(_price, token.decimals);
      const deadline = Math.floor(endTime.getTime() / 1000);
      const amount = price.mul(quantity);

      const erc20 = await getERC20Contract(token.address);
      const balance = await erc20.balanceOf(account);

      if (balance.lt(amount)) {
        const toastId = showToast(
          'error',
          `Insufficient ${token.symbol} Balance!`,
          token.symbol === 'WFTM' || token.symbol === 'WWAN'
            ? 'You can wrap WAN in the WWAN station.'
            : `You can exchange ${token.symbol} on other exchange site.`,
          () => {
            toast.dismiss(toastId);
            setOfferModalVisible(false);
            if (token.symbol === 'WFTM' || token.symbol === 'WWAN') {
              dispatch(ModalActions.showWFTMModal());
            }
          }
        );
        setOfferPlacing(false);
        setOfferConfirming(false);
        return;
      }

      if (bundleID) {
        const allowance = await erc20.allowance(
          account,
          Contracts[chainId].bundleSales
        );
        if (allowance.lt(amount)) {
          const tx = await erc20.approve(
            Contracts[chainId].bundleSales,
            amount
          );
          await tx.wait();
        }

        const tx = await createBundleOffer(
          bundleID,
          token.address,
          price,
          ethers.BigNumber.from(deadline)
        );

        await tx.wait();
      } else {
        const allowance = await erc20.allowance(
          account,
          Contracts[chainId].sales
        );
        if (allowance.lt(amount)) {
          const tx = await erc20.approve(
            Contracts[chainId].sales,
            ethers.constants.MaxUint256
          );
          await tx.wait();
        }

        const tx = await createOffer(
          address,
          ethers.BigNumber.from(tokenID),
          token.address,
          ethers.BigNumber.from(quantity),
          price,
          ethers.BigNumber.from(deadline)
        );

        await tx.wait();
      }

      setOfferModalVisible(false);
    } catch (e) {
      setOfferConfirming(false);
      showToast('error', formatError(e));
      console.log(e);
    } finally {
      setOfferPlacing(false);
    }
  };

  const handleAcceptOffer = async offer => {
    if (offerAccepting) return;

    try {
      setOfferAccepting(true);
      if (bundleID) {
        const tx = await acceptBundleOffer(bundleID, offer.creator);
        await tx.wait();
      } else {
        const tx = await acceptOffer(address, tokenID, offer.creator);
        await tx.wait();
      }
      setOfferAccepting(false);

      showToast('success', 'Offer accepted!');

      setOwner(offer.creator);

      offers.current = offers.current.filter(
        _offer => _offer.creator !== offer.creator
      );
    } catch (error) {
      showToast('error', formatError(error));
      setOfferAccepting(false);
    }
  };

  const handleCancelOffer = async () => {
    if (offerCanceling) return;

    try {
      setOfferCanceling(true);
      setOfferConfirming(true);

      if (bundleID) {
        const tx = await cancelBundleOffer(bundleID);
        await tx.wait();
      } else {
        const tx = await cancelOffer(address, tokenID);
        await tx.wait();
      }

      offerCanceledHandler(account, address, ethers.BigNumber.from(tokenID));
    } catch (error) {
      setOfferConfirming(false);
      showToast('error', formatError(error));
      setOfferCanceling(false);
    }
  };

  const handleStartAuction = async (
    token,
    _price,
    _startTime,
    _endTime,
    minBidReserve
  ) => {
    try {
      setAuctionStarting(true);
      setAuctionStartConfirming(true);

      const price = ethers.utils.parseUnits(_price, token.decimals);
      const startTime = Math.floor(_startTime.getTime() / 1000);
      const endTime = Math.floor(_endTime.getTime() / 1000);

      const tx = await createAuction(
        address,
        ethers.BigNumber.from(tokenID),
        token.address === '' ? ethers.constants.AddressZero : token.address,
        price,
        ethers.BigNumber.from(startTime),
        ethers.BigNumber.from(endTime),
        minBidReserve
      );
      await tx.wait();

      setAuctionStarting(false);
      setAuctionModalVisible(false);
    } catch (error) {
      setAuctionStartConfirming(false);
      showToast('error', formatError(error));
      setAuctionStarting(false);
    }
  };

  const handleUpdateAuction = async (token, _price, _startTime, _endTime) => {
    if (!auction.current) return;

    try {
      setAuctionUpdating(true);
      setAuctionUpdateConfirming(true);

      if (parseFloat(_price) !== auction.current.reservePrice) {
        const price = ethers.utils.parseUnits(_price, token.decimals);
        await updateAuctionReservePrice(
          address,
          ethers.BigNumber.from(tokenID),
          ethers.BigNumber.from(price)
        );
      }

      const startTime = Math.floor(_startTime.getTime() / 1000);
      if (startTime !== auction.current.startTime) {
        await updateAuctionStartTime(
          address,
          ethers.BigNumber.from(tokenID),
          ethers.BigNumber.from(startTime)
        );
      }

      const endTime = Math.floor(_endTime.getTime() / 1000);
      if (endTime !== auction.current.endTime) {
        await updateAuctionEndTime(
          address,
          ethers.BigNumber.from(tokenID),
          ethers.BigNumber.from(endTime)
        );
      }

      setAuctionUpdating(false);
      setAuctionModalVisible(false);
    } catch (error) {
      setAuctionUpdateConfirming(false);
      showToast('error', formatError(error));
      setAuctionUpdating(false);
    }
  };

  const cancelCurrentAuction = async () => {
    if (auctionCanceling) return;

    try {
      setAuctionCanceling(true);
      setAuctionCancelConfirming(true);
      await cancelAuction(address, tokenID);
    } catch (err) {
      setAuctionCancelConfirming(false);
      showToast('error', formatError(err));
      console.log(err);
    } finally {
      setAuctionCanceling(false);
    }
  };

  const handleResultAuction = async () => {
    if (bid === null) {
      showToast('info', 'No bids were placed!');
      return;
    }

    if (resulting) return;

    try {
      setResulting(true);
      await resultAuction(address, tokenID);
      setResulting(false);
      setResulted(true);
      auction.current = null;
      showToast('success', 'Auction resulted!');

      setOwner(bid.bidder);
    } catch (error) {
      showToast('error', formatError(error));
      setResulting(false);
    }
  };

  const handlePlaceBid = async _price => {
    if (bidPlacing) return;

    try {
      setBidPlacing(true);

      const { token } = auction.current;
      const price = ethers.utils.parseUnits(_price, token.decimals);
      if (token.address !== '') {
        const erc20 = await getERC20Contract(token.address);
        const balance = await erc20.balanceOf(account);
        if (balance.lt(price)) {
          const toastId = showToast(
            'error',
            `Insufficient ${token.symbol} Balance!`,
            token.symbol === 'WFTM' || token.symbol === 'WWAN'
              ? 'You can wrap WAN in the WWAN station.'
              : `You can exchange ${token.symbol} on other exchange site.`,
            () => {
              toast.dismiss(toastId);
              setBidModalVisible(false);
              if (token.symbol === 'WFTM' || token.symbol === 'WWAN') {
                dispatch(ModalActions.showWFTMModal());
              }
            }
          );
          setBidPlacing(false);
          return;
        }
        const auctionContract = await getAuctionContract();
        const allowance = await erc20.allowance(
          account,
          auctionContract.address
        );
        if (allowance.lt(price)) {
          const tx = await erc20.approve(auctionContract.address, price);
          await tx.wait();
        }
      }
      const tx = await placeBid(
        address,
        ethers.BigNumber.from(tokenID),
        token.address === '' ? ethers.constants.AddressZero : token.address,
        price,
        account
      );
      await tx.wait();

      showToast('success', 'Bid placed successfully!');

      setBidPlacing(false);
      setBidModalVisible(false);
    } catch (error) {
      showToast('error', formatError(error));
      setBidPlacing(false);
    }
  };

  const handleWithdrawBid = async () => {
    if (bidWithdrawing) return;

    try {
      setBidWithdrawing(true);
      await withdrawBid(address, ethers.BigNumber.from(tokenID));
      setBidWithdrawing(false);
      showToast('success', 'You have withdrawn your bid!');
    } catch (error) {
      showToast('error', formatError(error));
      setBidWithdrawing(false);
    }
  };

  const hasMyOffer = (() =>
    offers.current.findIndex(
      offer =>
        offer.creator?.toLowerCase() === account?.toLowerCase() &&
        offer.deadline >= now.getTime()
    ) > -1)();

  const data = [...tradeHistory.current].reverse().map(history => {
    const saleDate = new Date(history.createdAt);
    return {
      date: `${saleDate.getFullYear()}/${saleDate.getMonth() +
        1}/${saleDate.getDate()}`,
      price: history.priceInUSD,
      amt: 2100,
    };
  });

  const formatDiff = diff => {
    if (diff >= ONE_MONTH) {
      const m = Math.ceil(diff / ONE_MONTH);
      return `${m} Month${m > 1 ? 's' : ''}`;
    }
    if (diff >= ONE_DAY) {
      const d = Math.ceil(diff / ONE_DAY);
      return `${d} Day${d > 1 ? 's' : ''}`;
    }
    if (diff >= ONE_HOUR) {
      const h = Math.ceil(diff / ONE_HOUR);
      return `${h} Hour${h > 1 ? 's' : ''}`;
    }
    if (diff >= ONE_MIN) {
      const h = Math.ceil(diff / ONE_MIN);
      return `${h} Min${h > 1 ? 's' : ''}`;
    }
    return `${diff} Second${diff > 1 ? 's' : ''}`;
  };

  const formatExpiration = deadline => {
    if (deadline < now.getTime()) return 'Expired';

    let diff = new Date(deadline).getTime() - now.getTime();
    diff = Math.floor(diff / 1000);
    return formatDiff(diff);
  };

  const formatDuration = endTime => {
    const diff = endTime - Math.floor(now.getTime() / 1000);
    return formatDiff(diff);
  };

  const formatDate = _date => {
    const date = new Date(_date);
    const diff = Math.floor((now - date.getTime()) / 1000);
    return `${formatDiff(diff)} Ago`;
  };

  const auctionStarted = now.getTime() / 1000 >= auction.current?.startTime;

  const auctionEnded =
    auction.current?.endTime <= now.getTime() / 1000 || resulted;

  const auctionActive = () => auctionStarted && !auctionEnded;

  const myListing = () => {
    return listings.current.find(
      listing => listing?.owner.toLowerCase() === account?.toLowerCase()
    );
  };

  const hasListing = (() => {
    return bundleListing.current || myListing() !== undefined;
  })();

  const bestListing = (() => {
    if (bundleID) return bundleListing.current;
    let idx = 0;
    while (
      idx < listings.current.length &&
      listings.current[idx]?.owner.toLowerCase() === account?.toLowerCase()
    ) {
      idx++;
    }
    if (idx < listings.current.length) return listings.current[idx];
    return null;
  })();

  const maxSupply = useCallback(() => {
    let supply = 0;
    holders.map(holder => {
      if (
        holder.address.toLowerCase() !== account?.toLowerCase() &&
        holder.supply > supply
      ) {
        supply = holder.supply;
      }
    });
    return supply;
  }, [holders]);

  const onTransferClick = async () => {
    if (auction.current?.resulted === false) {
      showToast('warning', 'Please cancel current auction before transfer.');
      return;
    }
    if (hasListing) {
      showToast(
        'warning',
        'You have listed your item. Please cancel listing before transfer.'
      );
      return;
    }
    setTransferModalVisible(true);
  };

  const onBurnClick = async () => {
    if (auction.current?.resulted === false) {
      showToast('warning', 'Please cancel current auction before burn.');
      return;
    }
    if (hasListing) {
      showToast(
        'warning',
        'You have listed your item. Please cancel listing before burn.'
      );
      return;
    }
    setBurnModalVisible(true);
  };

  const handleMenuOpen = e => {
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleClose = () => {
    setShareAnchorEl(null);
  };

  const handleCopyLink = () => {
    handleClose();
    showToast('success', 'Link copied to clipboard!');
  };

  const handleShareOnFacebook = () => {
    handleClose();
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`,
      '_blank'
    );
  };

  const handleShareToTwitter = () => {
    handleClose();
    window.open(
      `https://twitter.com/intent/tweet?text=Check%20out%20this%20item%20on%20Artion&url=${window.location.href}`,
      '_blank'
    );
  };

  const handleSelectFilter = _filter => {
    setFilter(_filter);
    handleMenuClose();
  };

  // new methods
  const handleOnShare = social => {
    if (social === 'facebook') {
      handleShareOnFacebook();
    } else if (social === 'twitter') {
      handleShareToTwitter();
    }
  };

  if (loading) {
    return (
      <div className="overflow-hidden">
        <Header />
        <div className="container">
          {/*
          <Link to="/" className="btn btn-white btn-sm my-40">
            Back to home
          </Link>*/}
          <div
            className="item_details my-40"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Loader type="Oval" color="#00A59A" height={40} width={40} />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="overflow-hidden artwork_detail_page">
      <Header />
      <div className="container">
        {/*<Link to="/explore" className="btn btn-white btn-sm my-40">
          Back to Explore
        </Link>*/}
        <div className="item_details my-40">
          <div className="row md:space-y-20">
            <div className="col-lg-6">
              <div className="space-y-20">
                <div className={styles.artworkMinHeight}>
                  
                  <ArtworkMediaView
                    className="item_img"
                    image={
                      info.animation_url ? info.animation_url : info?.image
                    }
                    coverImage={info?.image}
                    alt=""
                  />
                </div>
                <ArtworkDetailPageDetailSection
                  itemType={tokenType.current}
                  info={info}
                  bundleID={bundleID}
                  listings={listings.current}
                  transferHistory={transferHistory.current}
                  address={address}
                  tokenID={tokenID}
                  prices={prices}
                  creatorInfoLoading={creatorInfoLoading}
                  creatorInfo={creatorInfo}
                  creator={creator}
                  account={account}
                  collection={collection}
                  explorerUrl={explorerUrl}
                  collectionRoyalty={collectionRoyalty}
                  tokenInfo={tokenInfo}
                  bundleListing={bundleListing.current}
                  loading={loading}
                  owner={owner}
                  ownerInfo={ownerInfo}
                  isMine={isMine}
                  buyingItem={buyingItem}
                  data={data}
                  offers={offers.current}
                  now={now}
                  myHolding={myHolding}
                  salesContractApproving={salesContractApproving}
                  offerAccepting={offerAccepting}
                  isBundleContractApproved={isBundleContractApproved}
                  salesContractApproved={salesContractApproved}
                  offerCanceling={offerCanceling}
                  tokenType={tokenType.current}
                  auction={auction.current}
                  offerPlacing={offerPlacing}
                  handleApproveBundleSalesContract={
                    handleApproveBundleSalesContract
                  }
                  handleApproveSalesContract={handleApproveSalesContract}
                  handleBuyBundle={handleBuyBundle}
                  handleBuyItem={handleBuyItem}
                  handleAcceptOffer={handleAcceptOffer}
                  handleCancelOffer={handleCancelOffer}
                  setOfferModalVisible={setOfferModalVisible}
                  onTransferClick={onTransferClick}
                  onBurnClick={onBurnClick}
                />
              </div>
            </div>

            <div className="col-lg-6">
              <div className="space-y-20">
                <div className="row space-y-10">
                  <div className="col-sm-10 space-y-10">
                    <div className="d-flex">
                      <a
                        className={cx(
                          styles.itemCategory,
                          'btn btn-sm rounded-pill bg_brand'
                        )}
                        style={{ cursor: 'pointer' }}
                        href={'/collection/' + address}
                        /*
                    onClick={() => {
                      history.push('/collection/'+address);
                      
                      collection?.erc721Address &&
                        dispatch(
                          FilterActions.updateCollectionsFilter([
                            collection.erc721Address,
                          ])
                        );
                        
                    }}
                    */
                      >
                        {collection?.collectionName || collection?.name || ''}
                        {collection?.isVerified ? (
                          <img src="/verified.svg" />
                        ) : (
                          ''
                        )}
                      </a>
                    </div>
                    <div>
                      <h3>{info?.name || ''}</h3>
                      {tokenInfo?.totalSupply > 0 && (
                        <small className="color_text">
                          {tokenInfo?.totalSupply} edition
                          {tokenInfo?.totalSupply > 1 ? 's' : ''}
                        </small>
                      )}
                      {!tokenInfo?.totalSupply && (
                        <small className="color_text">unique edition</small>
                      )}
                    </div>
                  </div>
                  <div className="col-sm-2 space-y-5">
                    <div
                      className="cursor-pointer likes space-x-3 justify-content-center"
                      onClick={toggleFavorite}
                    >
                      <i
                        className={cx(
                          isLike ? 'ri-heart-3-fill' : 'ri-heart-3-line'
                        )}
                      ></i>
                      <span className="txt_sm">{formatNumber(liked || 0)}</span>
                    </div>
                    <small
                      className="color_text"
                      style={{ textAlign: 'center', display: 'block' }}
                    >
                      <FontAwesomeIcon icon={faEye} color="#A2A2AD" />
                      &nbsp;
                      {isNaN(views) ? (
                        <Skeleton width={80} height={20} />
                      ) : (
                        `${formatNumber(views)} view${views !== 1 ? 's' : ''}`
                      )}
                    </small>
                  </div>
                </div>
                <ArtworkDetailPagePriceSection
                  bid={bid}
                  bestListing={bestListing}
                  prices={prices}
                  account={account}
                  buyingItem={buyingItem}
                  bundleID={bundleID}
                  isMine={isMine}
                  auction={auction}
                  auctionCanceling={auctionCanceling}
                  cancelCurrentAuction={cancelCurrentAuction}
                  handleResultAuction={handleResultAuction}
                  auctionCancelConfirming={auctionCancelConfirming}
                  hasListing={hasListing}
                  tokenType={tokenType}
                  auctionStarting={auctionStarting}
                  auctionUpdating={auctionUpdating}
                  auctionEnded={auctionEnded}
                  setAuctionModalVisible={setAuctionModalVisible}
                  auctionStartConfirming={auctionStartConfirming}
                  auctionUpdateConfirming={auctionUpdateConfirming}
                  cancelingListing={cancelingListing}
                  resulting={resulting}
                  cancelList={cancelList}
                  cancelListingConfirming={cancelListingConfirming}
                  listingItem={listingItem}
                  myHolding={myHolding}
                  priceUpdating={priceUpdating}
                  setSellModalVisible={setSellModalVisible}
                  listingConfirming={listingConfirming}
                  tokenInfo={tokenInfo}
                  offerPlacing={offerPlacing}
                  offerCanceling={offerCanceling}
                  handleBuyBundle={handleBuyBundle}
                  handleCancelOffer={handleCancelOffer}
                  setOfferModalVisible={setOfferModalVisible}
                  offerConfirming={offerConfirming}
                  hasMyOffer={hasMyOffer}
                  handleBuyItem={handleBuyItem}
                />
                <ArtworkDetailPageStateSection
                  data={{
                    ownerInfoLoading,
                    tokenOwnerLoading,
                    owner,
                    tokenInfo,
                    tokenType,
                    bundleID,
                    ownerInfo,
                    isMine,
                    holders,
                    views,
                    creator,
                    creatorInfo,
                    creatorInfoLoading,
                    account,
                    tokenUri,
                  }}
                  setOwnersModalVisible={setOwnersModalVisible}
                />
                <div className="d-flex justify-content-between">
                  <div className="space-x-10 d-flex align-items-center">
                    <div className={styles.royaltyFee}>
                      Total trading fee is{' '}
                      {collectionRoyalty?.royalty +
                        nftRoyalty?.royalty +
                        platformFee?.royalty}
                      %
                      <BootstrapTooltip
                        title={
                          <>
                            NFT Royalty: {nftRoyalty?.royalty}%
                            <br />
                            Collection Royalty: {collectionRoyalty?.royalty}%
                            <br />
                            Platform Fee: {platformFee?.royalty}%
                          </>
                        }
                        placement="top"
                      >
                        <HelpOutlineIcon />
                      </BootstrapTooltip>
                    </div>
                  </div>
                </div>

                {hasUnlockable && (
                  <div className={`${styles.bestBuy} box rounded-20`}>
                    <div
                      className={styles.unlockableLabel}
                    >{`This item has unlockable content.${
                      !isMine ? ' Only owners can see the content.' : ''
                    }`}</div>
                    {isMine ? (
                      unlockableContent ? (
                        <textarea
                          className={styles.unlockableContent}
                          value={unlockableContent}
                          readOnly
                        />
                      ) : (
                        <div
                          className={cx(
                            styles.revealBtn,
                            ' btn btn-warning btn-lg rounded-20',
                            revealing && styles.disabled
                          )}
                          onClick={handleRevealContent}
                        >
                          {revealing ? (
                            <ClipLoader color="#FFF" size={16} />
                          ) : (
                            `Reveal Content`
                          )}
                        </div>
                      )
                    ) : null}
                  </div>
                )}

                {(winner || auction.current?.resulted === false) && (
                  <div className={`${styles.panelWrapper} boxNoPad`}>
                    <Panel
                      title={
                        auctionStarted
                          ? auctionEnded
                            ? 'Auction ended'
                            : `Auction ends in ${formatDuration(
                                auction.current.endTime
                              )} (${new Date(
                                auction.current.endTime * 1000
                              ).toLocaleString()})`
                          : `Auction starts in ${formatDuration(
                              auction.current.startTime
                            )}`
                      }
                      icon={GavelIcon}
                      fixed
                      containerClassName="px-20 border-none"
                      headerClassName="px-0"
                    >
                      <div className={styles.bids}>
                        {auctionEnded ? (
                          <div className={styles.result}>
                            {auction.current.resulted ? (
                              <>
                                {'Winner: '}
                                <Link to={`/account/${winner}`}>
                                  {winner?.toLowerCase() ===
                                  account?.toLowerCase()
                                    ? 'Me'
                                    : shortenAddress(winner)}
                                </Link>
                                &nbsp;(
                                <img
                                  src={winningToken?.icon}
                                  className={styles.tokenIcon}
                                />
                                {formatNumber(winningBid)})
                              </>
                            ) : (
                              'Auction has concluded'
                            )}
                          </div>
                        ) : (
                          ''
                        )}
                        {bid ? (
                          <div>
                            <div className={styles.bidtitle}>
                              Reserve Price :&nbsp;
                              <img
                                src={auction.current.token?.icon}
                                className={styles.tokenIcon}
                              />
                              {formatNumber(auction.current.reservePrice)}
                            </div>
                            <div className={styles.bidtitle}>
                              Highest Bid :&nbsp;
                              <img
                                src={auction.current.token?.icon}
                                className={styles.tokenIcon}
                              />
                              {formatNumber(bid.bid)} (
                              {formatNumber(auctionBidParticipants)} Participant
                              {auctionBidParticipants > 1 ? 's' : ''})
                              {bid.bid < auction.current.reservePrice
                                ? ' -- Reserve price not met'
                                : ''}
                            </div>
                          </div>
                        ) : (
                          <div className={styles.bidtitle}>
                            <div>
                              No bids yet (Reserve Price :&nbsp;
                              <img
                                src={auction.current.token?.icon}
                                className={styles.tokenIcon}
                              />
                              {formatNumber(auction.current.reservePrice)}
                              {minBid > 0 &&
                                ` | First Bid
                        should match reserve price`}
                              )
                            </div>
                          </div>
                        )}


                        {!isMine &&
                          (!auctionActive() &&
                          bid?.bidder?.toLowerCase() === account?.toLowerCase()
                            ? now.getTime() / 1000 <
                                auction?.current?.endTime + 86400 && (
                                <p style={{marginTop:5}}>
                                  <FontAwesomeIcon icon={faExclamationTriangle}/> You can withdraw your bidded amount within {formatDuration((auction?.current?.endTime + 86400))}
                                </p>
                              )
                            : (<></>))}

                        {!isMine &&
                          (!auctionActive() &&
                          bid?.bidder?.toLowerCase() === account?.toLowerCase()
                            ? now.getTime() / 1000 >=
                                auction?.current?.endTime + 86400 && (
                                <div
                                  className={`${cx(
                                    styles.withdrawBid,
                                    bidWithdrawing && styles.disabled
                                  )} btn btn-warning btn-lg rounded-20`}
                                  onClick={() => handleWithdrawBid()}
                                >
                                  {bidWithdrawing
                                    ? 'Withdrawing Bid...'
                                    : 'Withdraw Bid'}
                                </div>
                              )
                            : // )
                              !isMine &&
                              bid?.bidder?.toLowerCase() !==
                                account?.toLowerCase() &&
                              auctionActive() && (
                                <div
                                  className={cx(
                                    styles.placeBid,
                                    bidPlacing && styles.disabled,
                                    ' btn btn-warning btn-lg rounded-20'
                                  )}
                                  onClick={() => setBidModalVisible(true)}
                                >
                                  Place Bid
                                </div>
                              ))}
                        {isMine && auctionEnded && !auction.current.resulted && (
                          <div
                            className={`${cx(
                              styles.placeBid,
                              resulting && styles.disabled
                            )} btn btn-warning btn-lg rounded-20`}
                            onClick={
                              bid === null ||
                              bid?.bid < auction.current?.reservePrice
                                ? cancelCurrentAuction
                                : handleResultAuction
                            }
                          >
                            {auctionCancelConfirming ? (
                              <ClipLoader color="#FFF" size={16} />
                            ) : bid === null ||
                              bid?.bid < auction.current.reservePrice ? (
                              'Reserve Price not met. Cancel Auction'
                            ) : (
                              'Accept highest bid'
                            )}
                          </div>
                        )}
                      </div>
                    </Panel>
                  </div>
                )}
                {!bundleID && (
                  <div className={`${styles.panelWrapper} boxNoPad`}>
                    <Panel title="Price History" icon={TimelineIcon}>
                      <ReactResizeDetector>
                        {({ width }) =>
                          width > 0 ? (
                            <div className={styles.chartWrapper}>
                              <div className={styles.chart}>
                                <LineChart
                                  width={width}
                                  height={250}
                                  data={data}
                                  margin={{
                                    top: 5,
                                    right: 30,
                                    left: 20,
                                    bottom: 5,
                                  }}
                                >
                                  <XAxis dataKey="date" />
                                  <YAxis />
                                  <ChartTooltip />
                                  <CartesianGrid stroke="#eee" />
                                  <Line
                                    type="monotone"
                                    dataKey="price"
                                    stroke="#00a59a"
                                  />
                                </LineChart>
                              </div>
                            </div>
                          ) : (
                            <div>{width}</div>
                          )
                        }
                      </ReactResizeDetector>
                    </Panel>
                  </div>
                )}
                <div className={`${styles.panelWrapper} boxNoPad`}>
                  <Panel
                    title="Listings"
                    icon={LocalOfferIcon}
                    expanded
                    containerClassName="px-20 border-none"
                    headerClassName="px-0"
                  >
                    <div className={styles.listings}>
                      <div
                        className={cx(
                          styles.listing,
                          styles.heading,
                          'bg-white'
                        )}
                      >
                        <div className={styles.price}>Price</div>
                        {tokenInfo?.totalSupply > 1 && (
                          <div className={styles.quantity}>Quantity</div>
                        )}
                        {tokenInfo?.totalSupply > 1 && (
                          <div className={styles.total}>Total</div>
                        )}
                        <div className={styles.owner}>From</div>
                        <div className={styles.buy} />
                      </div>
                      {/*console.log('!listings', listings)*/}
                      {bundleID
                        ? bundleListing.current && (
                            <div className={styles.listing}>
                              <div className={styles.owner}>
                                {loading ? (
                                  <Skeleton width={100} height={20} />
                                ) : (
                                  <Link to={`/account/${owner}`}>
                                    <div className={styles.userAvatarWrapper}>
                                      {ownerInfo?.imageHash ? (
                                        <img
                                          src={`https://openzoo.mypinata.cloud/ipfs/${ownerInfo.imageHash}`}
                                          className={styles.userAvatar}
                                        />
                                      ) : (
                                        <Identicon
                                          account={owner}
                                          size={24}
                                          className={styles.userAvatar}
                                        />
                                      )}
                                    </div>
                                    {isMine
                                      ? 'Me'
                                      : ownerInfo?.alias ||
                                        shortenAddress(owner)}
                                  </Link>
                                )}
                              </div>
                              <div className={styles.price}>
                                {loading ? (
                                  <Skeleton width={100} height={20} />
                                ) : (
                                  <>
                                    <img
                                      src={bundleListing.current.token?.icon}
                                      className={styles.tokenIcon}
                                    />
                                    {formatNumber(bundleListing.current.price)}
                                  </>
                                )}
                              </div>
                              <div className={styles.buy}>
                                {!isMine && (
                                  <TxButton
                                    className={cx(
                                      'btn btn-primary btn-md rounded-20',
                                      styles.buyButton,
                                      buyingItem && styles.disabled
                                    )}
                                    onClick={handleBuyBundle}
                                  >
                                    {buyingItem ? (
                                      <ClipLoader color="#FFF" size={16} />
                                    ) : (
                                      'Buy'
                                    )}
                                  </TxButton>
                                )}
                              </div>
                            </div>
                          )
                        : listings.current.map((listing, idx) => (
                            <div className={styles.listing} key={idx}>
                              <div className={styles.price}>
                                <img
                                  src={listing.token?.icon}
                                  className={styles.tokenIcon}
                                />
                                <div>
                                  {formatNumber(listing.price)}
                                  <br />
                                  <span>
                                    (
                                    {prices[listing.token?.address] !==
                                    undefined ? (
                                      `$${(
                                        listing.price *
                                        prices[listing.token?.address]
                                      ).toFixed(2)}`
                                    ) : (
                                      <Skeleton width={60} height={24} />
                                    )}
                                    )
                                  </span>
                                </div>
                              </div>
                              {tokenInfo?.totalSupply > 1 && (
                                <div className={styles.quantity}>
                                  {formatNumber(listing.quantity)}
                                </div>
                              )}
                              {tokenInfo?.totalSupply > 1 && (
                                <div className={styles.price}>
                                  <img
                                    src={listing.token?.icon}
                                    className={styles.tokenIcon}
                                  />
                                  <div>
                                    {formatNumber(
                                      listing.price * listing.quantity
                                    )}

                                    <br />
                                    <span>
                                      (
                                      {prices[listing.token?.address] !==
                                      undefined ? (
                                        `$${(
                                          listing.quantity *
                                          listing.price *
                                          prices[listing.token?.address]
                                        ).toFixed(2)}`
                                      ) : (
                                        <Skeleton width={60} height={24} />
                                      )}
                                      )
                                    </span>
                                  </div>
                                </div>
                              )}
                              <div className={styles.owner}>
                                <Link to={`/account/${listing.owner}`}>
                                  <div className={styles.userAvatarWrapper}>
                                    {listing.image ? (
                                      <img
                                        src={`https://openzoo.mypinata.cloud/ipfs/${listing.image}`}
                                        className={styles.userAvatar}
                                      />
                                    ) : (
                                      <Identicon
                                        account={listing.owner}
                                        size={24}
                                        className={styles.userAvatar}
                                      />
                                    )}
                                  </div>
                                  {listing.alias || listing.owner?.substr(0, 6)}
                                </Link>
                              </div>
                              <div className={styles.buy}>
                                {listing.owner.toLowerCase() !==
                                  account?.toLowerCase() && (
                                  <TxButton
                                    className={cx(
                                      'btn btn-primary btn-md rounded-20',
                                      styles.buyButton,
                                      buyingItem && styles.disabled
                                    )}
                                    onClick={() => handleBuyItem(listing)}
                                  >
                                    {buyingItem ? (
                                      <ClipLoader color="#FFF" size={16} />
                                    ) : (
                                      'Buy x1'
                                    )}
                                  </TxButton>
                                )}
                              </div>
                            </div>
                          ))}
                    </div>
                  </Panel>
                </div>
                <div className={`${styles.panelWrapper} boxNoPad rounded-20`}>
                  <Panel
                    title="Direct Offers"
                    icon={TocIcon}
                    expanded
                    containerClassName="px-20 border-none"
                    headerClassName="px-0"
                  >
                    <div className={styles.offers}>
                      {offers.current.length ? (
                        <>
                          <div
                            className={cx(
                              styles.offer,
                              styles.heading,
                              'bg-white'
                            )}
                          >
                            <div className={styles.price}>Price</div>
                            {tokenInfo?.totalSupply > 1 && (
                              <div className={styles.quantity}>Quantity</div>
                            )}
                            {tokenInfo?.totalSupply > 1 && (
                              <div className={styles.total}>Total</div>
                            )}
                            <div className={styles.deadline}>Expires In</div>
                            <div className={styles.owner}>From</div>
                            <div className={styles.buy} />
                          </div>
                          {offers.current
                            .filter(offer => offer.deadline > now.getTime())
                            .sort((a, b) =>
                              a.pricePerItem < b.pricePerItem ? 1 : -1
                            )
                            .map((offer, idx) => (
                              <div className={styles.offer} key={idx}>
                                <div className={styles.price}>
                                  <img
                                    src={offer.token?.icon}
                                    className={styles.tokenIcon}
                                  />
                                  <div>
                                    {formatNumber(
                                      offer.pricePerItem || offer.price
                                    )}

                                    <br />
                                    <span>
                                      (
                                      {prices[offer.token.address] !==
                                      undefined ? (
                                        `$${(
                                          (offer.pricePerItem || offer.price) *
                                          prices[offer.token.address]
                                        ).toFixed(3)}`
                                      ) : (
                                        <Skeleton width={60} height={24} />
                                      )}
                                      )
                                    </span>
                                  </div>
                                </div>
                                {tokenInfo?.totalSupply > 1 && (
                                  <div className={styles.quantity}>
                                    {formatNumber(offer.quantity)}
                                  </div>
                                )}
                                {tokenInfo?.totalSupply > 1 && (
                                  <div className={styles.price}>
                                    <img
                                      src={offer.token?.icon}
                                      className={styles.tokenIcon}
                                    />
                                    <div>
                                      {formatNumber(
                                        offer.quantity *
                                          (offer.pricePerItem || offer.price)
                                      )}

                                      <br />
                                      <span>
                                        (
                                        {prices[offer.token.address] !==
                                        undefined ? (
                                          `$${(
                                            offer.quantity *
                                            (offer.pricePerItem ||
                                              offer.price) *
                                            prices[offer.token.address]
                                          ).toFixed(3)}`
                                        ) : (
                                          <Skeleton width={60} height={24} />
                                        )}
                                        )
                                      </span>
                                    </div>
                                  </div>
                                )}
                                <div className={styles.deadline}>
                                  {formatExpiration(offer.deadline)}
                                </div>
                                <div className={styles.owner}>
                                  <Link to={`/account/${offer.creator}`}>
                                    <div className={styles.userAvatarWrapper}>
                                      {offer.image ? (
                                        <img
                                          src={`https://openzoo.mypinata.cloud/ipfs/${offer.image}`}
                                          className={styles.userAvatar}
                                        />
                                      ) : (
                                        <Identicon
                                          account={offer.creator}
                                          size={24}
                                          className={styles.userAvatar}
                                        />
                                      )}
                                    </div>
                                    {offer.alias || offer.creator?.substr(0, 6)}
                                  </Link>
                                </div>
                                <div className={styles.buy}>
                                  {(isMine ||
                                    (myHolding &&
                                      myHolding.supply >= offer.quantity)) &&
                                    offer.creator?.toLowerCase() !==
                                      account?.toLowerCase() && (
                                      <div
                                        className={cx(
                                          'btn btn-primary btn-md rounded-20',
                                          styles.buyButton,
                                          (salesContractApproving ||
                                            offerAccepting) &&
                                            styles.disabled
                                        )}
                                        onClick={
                                          bundleID
                                            ? isBundleContractApproved
                                              ? () => handleAcceptOffer(offer)
                                              : handleApproveBundleSalesContract
                                            : salesContractApproved
                                            ? () => handleAcceptOffer(offer)
                                            : handleApproveSalesContract
                                        }
                                      >
                                        {!(bundleID
                                          ? isBundleContractApproved
                                          : salesContractApproved) ? (
                                          salesContractApproving ? (
                                            <ClipLoader
                                              color="#FFF"
                                              size={16}
                                            />
                                          ) : (
                                            'Approve'
                                          )
                                        ) : offerAccepting ? (
                                          <ClipLoader color="#FFF" size={16} />
                                        ) : offer?.quantity > 1 ? (
                                          'Accept All'
                                        ) : (
                                          'Accept'
                                        )}
                                      </div>
                                    )}
                                  {offer.creator?.toLowerCase() ===
                                    account?.toLowerCase() && (
                                    <div
                                      className={cx(
                                        'btn btn-primary btn-md rounded-20',
                                        styles.buyButton,
                                        offerCanceling && styles.disabled
                                      )}
                                      onClick={() => handleCancelOffer()}
                                    >
                                      {offerCanceling ? (
                                        <ClipLoader color="#FFF" size={16} />
                                      ) : (
                                        'Withdraw'
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                        </>
                      ) : (
                        <div className={styles.noOffers}>
                          <div className={styles.noOffersLabel}>
                            No Offers Yet
                          </div>
                          {(!isMine ||
                            (tokenType.current === 1155 &&
                              myHolding.supply < tokenInfo.totalSupply)) &&
                            (!auction.current || auction.current.resulted) && (
                              <TxButton
                                className={cx(
                                  styles.makeOffer,
                                  'btn btn-primary btn-lg rounded-20',
                                  offerPlacing && styles.disabled
                                )}
                                onClick={() => setOfferModalVisible(true)}
                              >
                                Make Offer
                              </TxButton>
                            )}
                        </div>
                      )}
                    </div>
                  </Panel>
                </div>
                <ArtworkDetailPageHistorySection
                  moreItems={moreItems.current}
                  loading={loading}
                  historyLoading={historyLoading}
                  tokenType={tokenType}
                  tradeHistory={tradeHistory.current}
                  transferHistory={transferHistory.current}
                  onFilterChange={handleSelectFilter}
                />
              </div>
            </div>
          </div>
        </div>
        {!bundleID && (
          <div className={`${styles.panelWrapper} boxNoPad`}>
            <Panel
              title="More from this collection"
              icon={ViewModuleIcon}
              responsive
              expanded
            >
              <div className={styles.panelBody}>
                {loading ? (
                  <div className={styles.loadingIndicator}>
                    <ClipLoader color="#007BFF" size={16} />
                  </div>
                ) : (
                  <div className={styles.itemsList}>
                    {moreItems.current?.map((item, idx) => (
                      <div key={idx} className={styles.moreItem}>
                        <AssetCard
                          preset="four"
                          item={item}
                          isLike={item.isLiked}
                          cardHeaderClassName={styles.moreNftCardHeader}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}
      </div>
      <Footer />
      <TransferModal
        visible={transferModalVisible}
        totalSupply={tokenType.current === 1155 ? myHolding?.supply : null}
        transferring={transferring}
        onTransfer={handleTransfer}
        onClose={() => setTransferModalVisible(false)}
      />
      <BurnModal
        visible={burnModalVisible}
        burning={burning}
        onBurn={handleBurn}
        onClose={() => setBurnModalVisible(false)}
      />
      <SellModal
        visible={sellModalVisible}
        onClose={() => setSellModalVisible(false)}
        onSell={hasListing ? handleUpdateListing : handleListItem}
        startPrice={
          bundleID ? bundleListing.current?.price || 0 : myListing()?.price || 0
        }
        myListing={myListing()}
        confirming={listingItem || priceUpdating}
        approveContract={
          bundleID
            ? handleApproveBundleSalesContract
            : handleApproveSalesContract
        }
        contractApproving={salesContractApproving}
        contractApproved={
          bundleID ? isBundleContractApproved : salesContractApproved
        }
        totalSupply={tokenType.current === 1155 ? myHolding?.supply : null}
      />
      <OfferModal
        visible={offerModalVisible}
        info={info}
        onClose={() => setOfferModalVisible(false)}
        onMakeOffer={handleMakeOffer}
        confirming={offerPlacing}
        totalSupply={tokenType.current === 1155 ? maxSupply() : null}
      />
      <AuctionModal
        visible={auctionModalVisible}
        info={info}
        onClose={() => setAuctionModalVisible(false)}
        onStartAuction={
          auction.current ? handleUpdateAuction : handleStartAuction
        }
        auction={auction.current}
        auctionStarted={auctionStarted}
        confirming={auctionStarting || auctionUpdating}
        approveContract={handleApproveAuctionContract}
        contractApproving={auctionContractApproving}
        contractApproved={auctionContractApproved}
      />
      <BidModal
        visible={bidModalVisible}
        info={info}
        onClose={() => setBidModalVisible(false)}
        onPlaceBid={handlePlaceBid}
        minBidAmount={bid?.bid ? bid?.bid : minBid}
        confirming={bidPlacing}
        token={auction.current?.token}
        firstBid={bid?.bid ? false : minBid > 0 ? true : false}
      />
      <OwnersModal
        visible={ownersModalVisible}
        onClose={() => setOwnersModalVisible(false)}
        holders={holders}
      />
      <LikesModal
        visible={likesModalVisible}
        onClose={() => setLikesModalVisible(false)}
        users={likeUsersFetching ? new Array(5).fill(null) : likeUsers.current}
      />
    </div>
  );
}
