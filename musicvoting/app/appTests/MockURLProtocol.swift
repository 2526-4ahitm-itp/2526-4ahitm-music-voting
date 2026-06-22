import Foundation

/// Intercepts requests made through `URLSession.shared` so view models that
/// hit the network directly can be tested without a real backend.
final class MockURLProtocol: URLProtocol {
    struct Stub {
        let statusCode: Int
        let body: Data
        let headers: [String: String]

        init(statusCode: Int = 200, body: Data = Data(), headers: [String: String] = [:]) {
            self.statusCode = statusCode
            self.body = body
            self.headers = headers
        }
    }

    /// Keyed by request URL's absolute string. Tests set this up before
    /// triggering the request and reset it in `tearDown`/`deinit`.
    nonisolated(unsafe) static var stubs: [String: Result<Stub, Error>] = [:]
    /// Optional: streamed line-by-line bodies for SSE-style `bytes(for:)` calls.
    nonisolated(unsafe) static var streamLines: [String: [String]] = [:]
    nonisolated(unsafe) static var requestedURLs: [URL] = []

    static func reset() {
        stubs = [:]
        streamLines = [:]
        requestedURLs = []
    }

    override class func canInit(with request: URLRequest) -> Bool {
        true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        guard let url = request.url else {
            client?.urlProtocol(self, didFailWithError: URLError(.badURL))
            return
        }
        MockURLProtocol.requestedURLs.append(url)
        let key = url.absoluteString

        if let lines = MockURLProtocol.streamLines[key] {
            let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: nil)!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            let body = lines.map { $0 + "\n" }.joined()
            client?.urlProtocol(self, didLoad: Data(body.utf8))
            client?.urlProtocolDidFinishLoading(self)
            return
        }

        guard let result = MockURLProtocol.stubs[key] else {
            client?.urlProtocol(self, didFailWithError: URLError(.unsupportedURL))
            return
        }

        switch result {
        case .failure(let error):
            client?.urlProtocol(self, didFailWithError: error)
        case .success(let stub):
            let response = HTTPURLResponse(
                url: url,
                statusCode: stub.statusCode,
                httpVersion: "HTTP/1.1",
                headerFields: stub.headers
            )!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: stub.body)
            client?.urlProtocolDidFinishLoading(self)
        }
    }

    override func stopLoading() {}
}
