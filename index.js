const { ethers } = require("ethers");
const fs = require("fs");

// 🔧 Konfigurasi jaringan
const RPC_URL = "https://testnet-rpc.monad.xyz/"; // Ganti dengan RPC Monad yang sesuai
const ROUTER_CONTRACT = "0xCa810D095e90Daae6e867c19DF6D9A8C56db2c89";
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function approve(address spender, uint256 amount) public returns (bool)"
];
const ROUTER_ABI = [
    "function getAmountsOut(uint256 amountIn, address[] memory path) public view returns (uint256[] memory amounts)",
    "function WETH() external pure returns (address)",
    "function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) payable external",
    "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external"
];

// 📂 Baca daftar private key dari `wallets.json`
const privateKeys = JSON.parse(fs.readFileSync("wallets.json")).wallets;

// 📂 Baca daftar tokens dari `tokens.txt`
const tokens = fs.readFileSync("tokens.txt", "utf8").split("\n").map(t => t.trim()).filter(t => t);

// 🔌 Inisialisasi provider
const provider = new ethers.JsonRpcProvider(RPC_URL);
const router = new ethers.Contract(ROUTER_CONTRACT, ROUTER_ABI, provider);

// 🛠 Cache symbol token agar tidak perlu fetch berulang
const tokenSymbols = {};

// 🔍 Fungsi untuk mendapatkan token symbol dari contract
async function getTokenSymbol(tokenAddress) {
    if (tokenSymbols[tokenAddress]) {
        return tokenSymbols[tokenAddress]; // Gunakan cache jika sudah tersedia
    }
    try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const symbol = await tokenContract.symbol();
        tokenSymbols[tokenAddress] = symbol; // Simpan di cache
        return symbol;
    } catch (error) {
        console.log(`❌ Gagal mendapatkan symbol untuk token: ${tokenAddress}`);
        return tokenAddress; // Gunakan alamat contract jika gagal
    }
}

// 🕒 Fungsi delay acak (70 - 310 detik)
const randomDelay = async () => {
    const delay = Math.floor(Math.random() * (310 - 70 + 1) + 70) * 1000;
    const minutes = Math.floor(delay / 60000);
    const seconds = ((delay % 60000) / 1000).toFixed(0);
    console.log(`[${new Date().toLocaleString()}] ⏳ Menunggu ${minutes} menit ${seconds} detik sebelum akun berikutnya...\n`);
    return new Promise(resolve => setTimeout(resolve, delay));
};

// 🔄 Fungsi swap MON ke Token dengan estimasi
async function swapMONForTokens(walletAddress, signer) {
    const randomToken = tokens[Math.floor(Math.random() * tokens.length)];
    const tokenSymbol = await getTokenSymbol(randomToken);
    const randomAmount = ethers.parseUnits((Math.random() * (0.3 - 0.1) + 0.1).toFixed(2), 18); // 0.1 - 0.3 MON
    const path = [await router.WETH(), randomToken];

    console.log(`\n🔄 Akun (${walletAddress}) sedang melakukan swap MONAD ke Token...`);
    console.log(`[${new Date().toLocaleString()}] 🔄 Token tujuan: ${tokenSymbol} (${randomToken})`);
    console.log(`[${new Date().toLocaleString()}] 🔹 Swap jumlah WMONAD secara acak: ${ethers.formatUnits(randomAmount, 18)} WMONAD`);

    // Estimasi jumlah token yang akan diterima
    const estimatedTokens = await router.getAmountsOut(randomAmount, path);
    const amountOutMin = ethers.parseUnits((ethers.formatUnits(estimatedTokens[1], 18) * 0.95).toString(), 18);

    console.log(`[${new Date().toLocaleString()}] 🔍 Estimasi ${tokenSymbol} yang diterima: ${ethers.formatUnits(estimatedTokens[1], 18)}`);

    try {
        const tx = await router.connect(signer).swapExactETHForTokens(
            amountOutMin,
            path,
            walletAddress,
            Math.floor(Date.now() / 1000) + 600,
            { value: randomAmount }
        );

        console.log(`[${new Date().toLocaleString()}] ✅ Swap MONAD ke ${tokenSymbol} berhasil! TX: ${tx.hash}`);
    } catch (error) {
        console.log(`❌ Swap gagal:`, error);
    }
}

// 🔄 Fungsi swap Token ke MON dengan estimasi
async function swapTokensForMON(walletAddress, signer) {
    const randomToken = tokens[Math.floor(Math.random() * tokens.length)];
    const tokenSymbol = await getTokenSymbol(randomToken);
    const tokenContract = new ethers.Contract(randomToken, ERC20_ABI, signer);
    const balance = await tokenContract.balanceOf(walletAddress);
    const decimals = await tokenContract.decimals();
    const formattedBalance = ethers.formatUnits(balance, decimals);
    const randomAmount = ethers.parseUnits((formattedBalance * (Math.random() * (0.02 - 0.01) + 0.01)).toFixed(6), decimals); // 1-2% balance
    const path = [randomToken, await router.WETH()];

    console.log(`\n🔄 Akun (${walletAddress}) sedang melakukan swap Token ke Monad...`);
    console.log(`[${new Date().toLocaleString()}] 🔄 Token yang dipilih: ${tokenSymbol} (${randomToken})`);
    console.log(`[${new Date().toLocaleString()}] 🔢 Swap ${ethers.formatUnits(randomAmount, decimals)} ${tokenSymbol} ke MONAD`);

    // Estimasi jumlah MONAD yang akan diterima
    const estimatedMON = await router.getAmountsOut(randomAmount, path);
    const amountOutMin = ethers.parseUnits((ethers.formatUnits(estimatedMON[1], 18) * 0.95).toString(), 18);

    console.log(`[${new Date().toLocaleString()}] 🔍 Estimasi MONAD yang diterima: ${ethers.formatUnits(estimatedMON[1], 18)}`);

    try {
        console.log(`[${new Date().toLocaleString()}] ⚠️ Approving ${tokenSymbol} ke Router...`);
        const approveTx = await tokenContract.approve(ROUTER_CONTRACT, randomAmount);
        await approveTx.wait();

        const tx = await router.connect(signer).swapExactTokensForETH(
            randomAmount,
            amountOutMin,
            path,
            walletAddress,
            Math.floor(Date.now() / 1000) + 600
        );

        console.log(`[${new Date().toLocaleString()}] ✅ Swap ${tokenSymbol} ke MONAD berhasil! TX: ${tx.hash}`);
    } catch (error) {
        console.log(`❌ Swap gagal:`, error);
    }
}

// 🔄 Looping swap tanpa henti
async function startSwapping() {
    while (true) {
        console.log(`\n🚀 **Memulai sesi swap baru...** 🚀`);

        for (let i = 0; i < privateKeys.length; i++) {
            try {
                const signer = new ethers.Wallet(privateKeys[i], provider);
                const walletAddress = await signer.getAddress();

                console.log(`\n🔄 Mulai proses untuk Akun ${i + 1}: ${walletAddress}`);

                if (Math.random() < 0.5) {
                    await swapMONForTokens(walletAddress, signer);
                } else {
                    await swapTokensForMON(walletAddress, signer);
                }

                await randomDelay();
            } catch (error) {
                console.log(`❌ Gagal memproses akun ${i + 1}: ${error.message}`);
            }
        }
    }
}

// 🔥 Mulai proses swap tanpa henti
startSwapping();
