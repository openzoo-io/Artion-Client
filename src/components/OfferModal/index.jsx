import React, { useEffect, useState } from 'react';
import Datetime from 'react-datetime';
import 'react-datetime/css/react-datetime.css';
import { ClipLoader } from 'react-spinners';
import Select from 'react-dropdown-select';
import Skeleton from 'react-loading-skeleton';
import { ethers } from 'ethers';
import cx from 'classnames';

import { formatNumber } from 'utils';
import useTokens from 'hooks/useTokens';
import { useSalesContract } from 'contracts';
import PriceInput from 'components/PriceInput';

import { RaroinModal as Modal } from '../Modal/RaroinModal';
import styles from '../Modal/common.module.scss';
import InputError from '../InputError';

const OfferModal = ({
  visible,
  info,
  onClose,
  onMakeOffer,
  confirming,
  totalSupply,
}) => {
  const { tokens } = useTokens();

  const { getSalesContract } = useSalesContract();

  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [endTime, setEndTime] = useState(
    new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
  );
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [tokenPrice, setTokenPrice] = useState();
  const [tokenPriceInterval, setTokenPriceInterval] = useState();
  const [inputError, setInputError] = useState(null);

  useEffect(() => {
    console.log('tokens', tokens);
    if (tokens?.length) {
      setOptions(tokens);
    }
  }, [tokens]);

  useEffect(() => {
    if (visible) {
      setPrice('');
      setQuantity('1');
      setEndTime(new Date(new Date().getTime() + 24 * 60 * 60 * 1000));
      if (tokens?.length) {
        setSelected([tokens[0]]);
      }
    }
  }, [visible]);

  const getTokenPrice = () => {
    if (tokenPriceInterval) clearInterval(tokenPriceInterval);
    const func = async () => {
      const tk = selected[0].address || ethers.constants.AddressZero;
      try {
        const salesContract = await getSalesContract();
        const price = await salesContract.getPrice(tk);
        setTokenPrice(parseFloat(ethers.utils.formatUnits(price, 18)));
      } catch {
        setTokenPrice(null);
      }
    };
    func();
    setTokenPriceInterval(setInterval(func, 60 * 1000));
  };

  useEffect(() => {
    if (selected.length === 0) return;

    getTokenPrice();
  }, [selected]);

  const handleQuantityChange = e => {
    const val = e.target.value;
    if (!val) {
      setQuantity('');
      return;
    }

    if (isNaN(val)) return;

    const _quantity = parseInt(val);
    setQuantity(Math.min(_quantity, totalSupply));
  };

  const handleMakeOffer = () => {
    let quant = 1;
    if (totalSupply > 1) {
      quant = parseInt(quantity);
    }
    onMakeOffer(selected[0], price, quant, endTime);
  };

  const validateInput = () => {
    if (price.length === 0 || parseFloat(price) == 0) return false;
    if (totalSupply > 1 && quantity.length === 0) return false;
    if (endTime.getTime() < new Date().getTime()) return false;
    return true;
  };

  return (
    <Modal
      visible={visible}
      title="PLACE YOUR OFFER"
      onClose={onClose}
      submitDisabled={confirming || !validateInput() || inputError}
      submitLabel={
        confirming ? <ClipLoader color="#FFF" size={16} /> : 'PLACE OFFER'
      }
      onSubmit={() =>
        !confirming && validateInput() ? handleMakeOffer() : null
      }
    >
      {info?.name && (
        <p>
          You are about to place an offer for
          <br />
          <span className="color_brand">{info?.name}</span>
        </p>
      )}

      <div className={styles.formGroup}>
        <div className={styles.formLabel}>Price</div>
        <div className="d-flex rounded-15 bg_input align-items-center">
          <Select
            options={options}
            labelField='symbol'
            valueField='address'
            disabled={confirming}
            values={selected}
            onChange={tk => {
              setSelected(tk);
            }}
            className={cx(styles.select, 'bg_input')}
            placeholder=""
            itemRenderer={({ item, itemIndex, methods }) => (
              <div
                key={itemIndex}
                className={styles.token}
                onClick={() => {
                  methods.clearAll();
                  methods.addItem(item);
                }}
              >
                <img src={item?.icon} className={styles.tokenIcon} />
                <div className={styles.tokenSymbol}>{item.symbol}</div>
              </div>
            )}
            contentRenderer={({ props: { values } }) =>
              values.length > 0 ? (
                <div className={styles.selectedToken}>
                  <img src={values[0]?.icon} className={styles.tokenIcon} />
                  <div className={styles.tokenSymbol}>{values[0].symbol}</div>
                </div>
              ) : (
                <div className={styles.selectedToken} />
              )
            }
          />
          <PriceInput
            className={styles.formInput}
            placeholder="0"
            decimals={0}
            value={'' + price}
            onChange={setPrice}
            disabled={confirming}
            onInputError={err => setInputError(err)}
          />
          <div className={`${styles.usdPrice} d-none d-sm-flex`}>
            {!isNaN(tokenPrice) && tokenPrice !== null ? (
              `$${formatNumber(
                ((parseFloat(price) || 0) * tokenPrice).toFixed(2)
              )}`
            ) : (
              <Skeleton width={100} height={24} />
            )}
          </div>
        </div>
        <div className={`${styles.usdPriceMobile} d-sm-none`}>
          {!isNaN(tokenPrice) && tokenPrice !== null ? (
            `$${formatNumber(
              ((parseFloat(price) || 0) * tokenPrice).toFixed(2)
            )}`
          ) : (
            <Skeleton width={100} height={24} />
          )}
        </div>
        <InputError text={inputError} />
      </div>

      {totalSupply !== null && (
        <div className={styles.formGroup}>
          <div className={styles.formLabel}>Quantity</div>
          <div className="d-flex rounded-15 bg_input align-items-center">
            <input
              className={styles.formInput}
              placeholder={totalSupply}
              value={quantity}
              onChange={handleQuantityChange}
              disabled={confirming || totalSupply === 1}
            />
          </div>
        </div>
      )}
      <div className={styles.formGroup}>
        <div className={styles.formLabel}>Offer Expiration</div>
        <div className="d-flex rounded-15 bg_input align-items-center">
          <Datetime
            value={endTime}
            onChange={val => setEndTime(val.toDate())}
            inputProps={{
              className: styles.formInput,
              onKeyDown: e => e.preventDefault(),
              disabled: confirming,
            }}
            closeOnSelect
            isValidDate={cur =>
              cur.valueOf() > new Date().getTime() - 1000 * 60 * 60 * 24
            }
          />
        </div>
      </div>
    </Modal>
  );
};

export default OfferModal;
