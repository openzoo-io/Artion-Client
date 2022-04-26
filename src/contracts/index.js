import { ethers } from 'ethers';

export * from './abi';
export * from './auctions';
export * from './sales';
export * from './bundleSales';
export * from './token';
export * from './wftm';
export * from './factory';
import { useWeb3React } from '@web3-react/core';
export const getSigner = async () => {
  const { connector } = useWeb3React();
  let web3provider = await connector.getProvider();
  await web3provider.enable();
  let provider = new ethers.providers.Web3Provider(web3provider);
  const signer = provider.getSigner();
  return signer;
};
