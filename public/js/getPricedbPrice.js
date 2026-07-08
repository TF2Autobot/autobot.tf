const xhr = new XMLHttpRequest();
xhr.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
        const json = JSON.parse(this.responseText);
        const price = json?.sell;
        const hasPrice = !!price;
        document.getElementById('pricedbLink').innerText = hasPrice
            ? `${
                  !!price.keys
                      ? `${price.keys} key${price.keys > 1 ? 's' : ''}${!!price.metal ? `, ${price.metal} ref` : ''}`
                      : `${price.metal} ref`
              }`
            : 'Pricedb.io';
    }
};
const sku = document.getElementById('getPricedbPrice').getAttribute('skupricedb');
xhr.open('get', `https://pricedb.io/api/item/${sku}`, true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send();
