use Rack::Static,
  :urls => ["/assets", "/lib", "/js"],
  :root => "."

run lambda { |env|
  [
    200,
    {
      'Content-Type'  => 'text/html',
      'Cache-Control' => 'assets, max-age=86400',
      'Cache-Control' => 'lib, max-age=86400'
    },
    File.open('index.html', File::RDONLY)
  ]
}
