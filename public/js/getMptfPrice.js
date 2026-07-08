// Function wrapper handles local scoping perfectly
function makeRequest(url, callback) {
    const xhr = new XMLHttpRequest(); // Unique local instance for each call
    xhr.open('GET', url, true);
    
    xhr.onload = function() {
        if (xhr.status === 200) {
            callback(null, JSON.parse(xhr.responseText));
        } else {
            callback(`Error: ${xhr.status}`);
        }
    };
    
    xhr.send();
}

const bptfQuery = document.getElementById('getMptfPrice').getAttribute('bptfQuery');
const url1 = `https://api.backpack.tf/item/get_third_party_prices/${bptfQuery}`
makeRequest(url1, (err, json) => {
    if (!err) {
        const price = json.prices?.mp?.lowest_price;
        const hasPrice = price && !Array.isArray(price);
        document.getElementById('mptfLink').innerText = 'Marketplace.tf' + `${hasPrice ? ` (${price})` : ''}`;
    };
});

const sku = document.getElementById('getMptfPrice').getAttribute('sku');
const url2 = `https://pricedb.io/api/item/${sku}`;

makeRequest(url2, (err, json) => {
    if (!err) {
        const price = json.sell;
        const hasPrice = !!price;
        document.getElementById('pricedbLink').innerText = hasPrice
            ? `Pricedb.io (${
                  !!price.keys
                      ? `${price.keys} key${price.keys > 1 ? 's' : ''}${!!price.metal ? `, ${price.metal} ref` : ''}`
                      : `${price.metal} ref`
              })`
            : 'Pricedb.io';
    }
});
